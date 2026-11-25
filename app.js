(() => {
  "use strict";

  // ---------- Constants ----------
  const START = 6 * 60;    // ruler starts at 06:00
  const END = 23 * 60;     // and ends at 23:00
  const SNAP = 15;
  const KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const data = window.PERCH || { cafes: [] };
  const all = Array.isArray(data.cafes) ? data.cafes : [];
  const hasReal = all.some((c) => !c.example);
  const cafes = hasReal ? all.filter((c) => !c.example) : all;
  const showingExamples = !hasReal && cafes.length > 0;

  // ---------- London time, always ----------
  const fmtParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hourCycle: "h23",
  });
  function londonNow() {
    const p = {};
    for (const part of fmtParts.formatToParts(new Date())) p[part.type] = part.value;
    return { y: +p.year, mo: +p.month, d: +p.day, min: (+p.hour % 24) * 60 + +p.minute };
  }
  function dateAt(offset) {
    const n = londonNow();
    const dt = new Date(Date.UTC(n.y, n.mo - 1, n.d + offset));
    return { wd: dt.getUTCDay(), d: dt.getUTCDate(), mo: dt.getUTCMonth() };
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const snap = (m) => clamp(Math.round(m / SNAP) * SNAP, START, END);
  const floorSnap = (m) => clamp(Math.floor(m / SNAP) * SNAP, START, END);
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (m) => (m >= 1440 ? "midnight" : `${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  const toMin = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
  const pct = (m) => ((clamp(m, START, END) - START) / (END - START)) * 100;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  // ---------- Café logic ----------
  function intervals(c, key) {
    return ((c.hours && c.hours[key]) || []).map(([a, b]) => {
      const s = toMin(a);
      let e = toMin(b);
      if (e <= s) e += 1440;
      return [s, e];
    });
  }
  const isOpen = (c, key, m) => intervals(c, key).some(([s, e]) => m >= s && m < e);
  function laptopOK(c, key, m) {
    const l = c.laptop || {};
    let ok = l.default !== false;
    for (const r of l.rules || []) {
      if (r.days && !r.days.includes(key)) continue;
      if (r.from && m < toMin(r.from)) continue;
      if (r.to && m >= toMin(r.to)) continue;
      ok = r.allowed !== false;
    }
    return ok;
  }
  const works = (c, key, m) => isOpen(c, key, m) && laptopOK(c, key, m);
  function until(c, key, m) {
    let t = m;
    while (t < 1440 && works(c, key, t)) t += 5;
    return t;
  }
  function reason(c, key, m, wd) {
    const iv = intervals(c, key);
    if (!iv.length) return `Closed on ${DAY[wd]}s`;
    if (!isOpen(c, key, m)) {
      const next = iv.filter(([s]) => s > m).sort((a, b) => a[0] - b[0])[0];
      if (next) return `Opens at ${fmt(next[0])}`;
      return `Closed at ${fmt(Math.max(...iv.map((x) => x[1])))}`;
    }
    for (let t = m; t < 1440; t += 5) if (works(c, key, t)) return `Laptops from ${fmt(t)}`;
    let lastEnd = null;
    for (let t = 0; t < m; t += 5) if (works(c, key, t)) lastEnd = t + 5;
    if (lastEnd !== null) return `No laptops after ${fmt(lastEnd)}`;
    return `No laptops on ${DAY[wd]}s`;
  }
  function segments(c, key) {
    const out = [];
    for (let t = START; t < END; t += SNAP) {
      const st = !isOpen(c, key, t) ? "closed" : laptopOK(c, key, t) ? "laptop" : "open";
      const last = out[out.length - 1];
      if (last && last.st === st) last.to = t + SNAP;
      else out.push({ st, from: t, to: t + SNAP });
    }
    return out.filter((s) => s.st !== "closed");
  }
  function barHTML(c, key, mark) {
    const segs = segments(c, key)
      .map((s) => `<span class="seg seg--${s.st}" style="left:${pct(s.from)}%;width:${pct(s.to) - pct(s.from)}%"></span>`)
      .join("");
    const m = mark == null ? "" : `<span class="bar__mark" style="left:${pct(mark)}%"></span>`;
    return `<div class="bar" aria-hidden="true">${segs}${m}</div>`;
  }
  function hoursText(c, key) {
    const raw = (c.hours && c.hours[key]) || [];
    return raw.length ? raw.map(([a, b]) => `${a}–${b}`).join(", ") : "Closed";
  }

  // ---------- Icons (Lucide, ISC licence) ----------
  const icon = (paths) => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ICONS = {
    wifi: icon('<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/>'),
    sockets: icon('<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>'),
    noise: icon('<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6"/>'),
    coffee: icon('<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>'),
    go: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>',
  };
  const NOTE_LABEL = { wifi: "Wifi", sockets: "Sockets", noise: "Noise", coffee: "Coffee" };

  // ---------- State ----------
  const now = londonNow();
  const state = { offset: 0, min: floorSnap(now.min), followNow: true, open: null };

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    when: $("when"), days: $("days"), ruler: $("ruler"), ticks: $("ticks"), needle: $("needle"),
    now: $("now"), lines: $("lines"), total: $("total"), void: $("void"), voidTitle: $("voidTitle"),
    voidLines: $("voidLines"), foot: $("foot"),
  };

  // ---------- Ruler ----------
  function buildTicks() {
    let html = "";
    for (let h = START / 60; h <= END / 60; h++) {
      const major = h % 3 === 0;
      html += `<span class="tick${major ? " tick--major" : ""}" style="left:${pct(h * 60)}%"></span>`;
      if (major) html += `<span class="tick__label" style="left:${pct(h * 60)}%">${pad(h)}</span>`;
    }
    el.ticks.innerHTML = html;
  }
  function minFromX(clientX) {
    const r = el.ruler.getBoundingClientRect();
    const f = clamp((clientX - r.left) / r.width, 0, 1);
    return snap(START + f * (END - START));
  }
  function setMin(m) {
    if (m === state.min) return;
    state.min = m;
    state.followNow = false;
    render();
  }
  let dragging = false;
  el.ruler.addEventListener("pointerdown", (e) => {
    dragging = true;
    el.ruler.classList.add("is-dragging");
    el.ruler.setPointerCapture(e.pointerId);
    setMin(minFromX(e.clientX));
  });
  el.ruler.addEventListener("pointermove", (e) => { if (dragging) setMin(minFromX(e.clientX)); });
  const stopDrag = () => { dragging = false; el.ruler.classList.remove("is-dragging"); };
  el.ruler.addEventListener("pointerup", stopDrag);
  el.ruler.addEventListener("pointercancel", stopDrag);
  el.ruler.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: -SNAP, ArrowDown: -SNAP, ArrowRight: SNAP, ArrowUp: SNAP, PageDown: -60, PageUp: 60 }[e.key];
    if (step) { e.preventDefault(); setMin(clamp(state.min + step, START, END)); }
    if (e.key === "Home") { e.preventDefault(); setMin(START); }
    if (e.key === "End") { e.preventDefault(); setMin(END); }
  });

  // ---------- Days and "now" ----------
  function withFade(fn) {
    if (!reduced && document.startViewTransition) document.startViewTransition(fn);
    else fn();
  }
  el.days.addEventListener("click", (e) => {
    const b = e.target.closest(".day");
    if (!b) return;
    const off = +b.dataset.offset;
    if (off === state.offset) return;
    withFade(() => { state.offset = off; state.followNow = false; render(); });
  });
  el.now.addEventListener("click", () => {
    withFade(() => { state.offset = 0; state.min = floorSnap(londonNow().min); state.followNow = true; render(); });
  });
  setInterval(() => {
    if (!state.followNow) return;
    const m = floorSnap(londonNow().min);
    if (m !== state.min) { state.min = m; render(); }
  }, 30000);

  // ---------- Lines ----------
  function lineHTML(c, ctx, ok) {
    const isOpenLine = state.open === c.id;
    const right = ok
      ? `<span class="leader"></span><span class="line__until"><small>until</small>${fmt(ctx.until)}</span>`
      : `<span class="leader"></span><span class="line__reason">${esc(ctx.reason)}</span>`;
    const meta = [c.area ? esc(c.area) : "", c.example ? '<span class="tag">Example</span>' : ""].filter(Boolean).join(" · ");
    return `<li class="line" id="line-${esc(c.id)}">
      <button type="button" class="line__btn" data-id="${esc(c.id)}" aria-expanded="${isOpenLine}" aria-controls="detail-${esc(c.id)}">
        <span class="line__row"><span class="line__name">${esc(c.name)}</span>${right}</span>
        ${meta ? `<span class="line__meta">${meta}</span>` : ""}
        ${isOpenLine ? "" : barHTML(c, ctx.key, state.min)}
      </button>
      ${isOpenLine ? detailHTML(c, ctx) : ""}
    </li>`;
  }

  function detailHTML(c, ctx) {
    const rows = WEEK.map((k) => {
      const cur = k === ctx.key;
      const wd = KEYS.indexOf(k);
      return `<span class="week__day${cur ? " is-current" : ""}">${DAY_SHORT[wd]}</span>
        <span class="week__hours${cur ? " is-current" : ""}">${esc(hoursText(c, k))}</span>
        ${barHTML(c, k, cur ? state.min : null)}`;
    }).join("");
    const notes = ["wifi", "sockets", "noise", "coffee"]
      .filter((k) => c[k])
      .map((k) => `<li>${ICONS[k]}<span><span class="sr">${NOTE_LABEL[k]}: </span>${esc(c[k])}</span></li>`)
      .join("");
    const dir = `https://maps.apple.com/?daddr=${c.lat},${c.lng}&q=${encodeURIComponent(c.name)}`;
    const visited = c.visited && !c.example ? `Visited ${longDate(c.visited)}` : "";
    return `<div class="detail" id="detail-${esc(c.id)}">
      <div class="week">${rows}</div>
      <div class="legend"><span><i class="swatch swatch--laptop"></i>Laptops OK</span><span><i class="swatch swatch--open"></i>Open, no laptops</span></div>
      ${notes ? `<ul class="notes">${notes}</ul>` : ""}
      ${c.note ? `<p class="said">${esc(c.note)}</p>` : ""}
      <div class="where">
        <span class="where__addr">${esc([c.address, visited].filter(Boolean).join(" · "))}</span>
        ${Number.isFinite(c.lat) && Number.isFinite(c.lng) ? `<a class="go" href="${dir}" target="_blank" rel="noopener">Directions ${ICONS.go}</a>` : ""}
      </div>
    </div>`;
  }

  function longDate(iso) {
    const [y, m, d] = String(iso).split("-").map(Number);
    if (!y || !m || !d) return esc(iso);
    return `${d} ${MONTH[m - 1]} ${y}`;
  }

  // ---------- Render ----------
  let lastMatches = [];
  function render() {
    const date = dateAt(state.offset);
    const key = KEYS[date.wd];
    const m = state.min;

    // Head
    const dayWord = state.offset === 0 ? "Today" : state.offset === 1 ? "Tomorrow" : DAY[date.wd];
    el.when.innerHTML = `<span class="when__day">${dayWord}</span><span class="when__time">${fmt(m)}</span>`;
    el.now.hidden = state.offset === 0 && state.followNow;

    let chips = "";
    for (let i = 0; i < 7; i++) {
      const d = dateAt(i);
      const name = i === 0 ? "Today" : DAY_SHORT[d.wd];
      const full = i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAY[d.wd];
      chips += `<button type="button" class="day" data-offset="${i}" aria-pressed="${i === state.offset}" aria-label="${full} ${d.d} ${MONTH[d.mo]}">
        <span class="day__name">${name}</span><span class="day__date">${d.d}</span></button>`;
    }
    el.days.innerHTML = chips;

    el.needle.style.left = `${pct(m)}%`;
    el.ruler.setAttribute("aria-valuenow", String(m));
    el.ruler.setAttribute("aria-valuetext", fmt(m));

    // Lines
    const ok = [];
    const no = [];
    for (const c of cafes) {
      if (works(c, key, m)) ok.push({ c, ctx: { key, until: until(c, key, m) } });
      else no.push({ c, ctx: { key, reason: reason(c, key, m, date.wd) } });
    }
    ok.sort((a, b) => b.ctx.until - a.ctx.until || a.c.name.localeCompare(b.c.name));
    no.sort((a, b) => a.c.name.localeCompare(b.c.name));
    lastMatches = ok;

    if (!cafes.length) {
      el.lines.innerHTML = `<li class="empty"><p class="empty__title">Nothing printed yet</p>
        <p class="empty__text">Tell Claude about the first café you try: its name, opening hours, and when laptops are OK.</p></li>`;
      el.total.innerHTML = "";
    } else if (!ok.length) {
      el.lines.innerHTML = `<li class="empty"><p class="empty__title">No café works at ${fmt(m)}</p>
        <p class="empty__text">Drag the ruler to another hour, or pick another day.</p></li>`;
      el.total.innerHTML = "";
    } else {
      el.lines.innerHTML = ok.map((x) => lineHTML(x.c, x.ctx, true)).join("");
      el.total.className = "total";
      el.total.innerHTML = `<span class="total__label">Total</span><span class="leader"></span><span class="total__value">${ok.length} ${ok.length === 1 ? "café" : "cafés"}</span>`;
    }
    if (!ok.length) el.total.className = "";

    el.void.hidden = !no.length;
    el.voidTitle.textContent = `Not at ${fmt(m)}`;
    el.voidLines.innerHTML = no.map((x) => lineHTML(x.c, x.ctx, false)).join("");

    // Footer
    const foot = [];
    if (showingExamples) foot.push("<p>These three are examples to show the layout. They go as soon as you add your first café.</p>");
    if (data.updated) foot.push(`<p>List updated ${longDate(data.updated)}</p>`);
    el.foot.innerHTML = foot.join("");

    updatePins(key, m);
  }

  // Line clicks (open in place)
  function onLineClick(e) {
    const b = e.target.closest(".line__btn");
    if (!b) return;
    const id = b.dataset.id;
    state.open = state.open === id ? null : id;
    render();
    if (state.open) focusOnMap(id);
  }
  el.lines.addEventListener("click", onLineClick);
  el.voidLines.addEventListener("click", onLineClick);

  // ---------- Map ----------
  let map = null;
  const pins = new Map();
  const wide = () => window.matchMedia("(min-width: 900px)").matches;

  function tint() {
    const layers = (map.getStyle() && map.getStyle().layers) || [];
    for (const l of layers) {
      const id = l.id.toLowerCase();
      try {
        if (l.type === "background") map.setPaintProperty(l.id, "background-color", "#ECEDEF");
        else if (l.type === "fill" && id.includes("water")) map.setPaintProperty(l.id, "fill-color", "#D2D9E0");
        else if (l.type === "fill" && /park|grass|wood|forest|landcover|cemetery/.test(id)) map.setPaintProperty(l.id, "fill-color", "#E1E5DF");
        else if (l.type === "fill" && id.includes("building")) map.setPaintProperty(l.id, "fill-color", "#E2E3E7");
        else if (l.type === "symbol" && l.layout && l.layout["text-field"]) {
          map.setPaintProperty(l.id, "text-color", "#83838C");
          map.setPaintProperty(l.id, "text-halo-color", "#F3F3F5");
          map.setLayoutProperty(l.id, "text-transform", "none");
          map.setLayoutProperty(l.id, "text-letter-spacing", 0);
        }
      } catch (_) { /* layer without that property */ }
    }
  }

  function padding() {
    return wide() ? { top: 60, bottom: 60, left: 520, right: 60 } : { top: 50, bottom: 50, left: 40, right: 40 };
  }

  function fit(animate) {
    if (!map || !cafes.length) return;
    const b = new maplibregl.LngLatBounds();
    cafes.forEach((c) => b.extend([c.lng, c.lat]));
    map.fitBounds(b, { padding: padding(), maxZoom: 14.5, duration: animate && !reduced ? 600 : 0 });
  }

  function focusOnMap(id) {
    const c = cafes.find((x) => x.id === id);
    if (!map || !c) return;
    const opts = { center: [c.lng, c.lat], zoom: Math.max(map.getZoom(), 14), padding: padding(), duration: reduced ? 0 : 700 };
    map.easeTo(opts);
  }

  function updatePins(key, m) {
    for (const c of cafes) {
      const p = pins.get(c.id);
      if (!p) continue;
      const on = works(c, key, m);
      const hoursLeft = on ? (until(c, key, m) - m) / 60 : 0;
      const d = on ? 12 + Math.min(hoursLeft, 8) * 2.5 : 10;
      p.style.setProperty("--d", `${d.toFixed(1)}px`);
      p.dataset.state = on ? "on" : "off";
      p.dataset.selected = String(state.open === c.id);
      p.setAttribute("aria-label", on ? `${c.name}, laptops OK until ${fmt(until(c, key, m))}` : `${c.name}, not at ${fmt(m)}`);
    }
  }

  function initMap() {
    if (!window.maplibregl) return;
    map = new maplibregl.Map({
      container: "map",
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [-0.115, 51.517],
      zoom: 12,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.on("style.load", tint);
    map.on("load", () => {
      fit(false);
      const attrib = document.querySelector(".maplibregl-ctrl-attrib");
      if (attrib) attrib.classList.remove("maplibregl-compact-show");
    });

    for (const c of cafes) {
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pin";
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        state.open = c.id;
        render();
        focusOnMap(c.id);
        const line = document.getElementById(`line-${c.id}`);
        if (line) line.scrollIntoView({ block: wide() ? "nearest" : "start", behavior: reduced ? "auto" : "smooth" });
      });
      new maplibregl.Marker({ element: b }).setLngLat([c.lng, c.lat]).addTo(map);
      pins.set(c.id, b);
    }
  }

  // ---------- Go ----------
  buildTicks();
  initMap();
  render();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.followNow) {
      state.min = floorSnap(londonNow().min);
      render();
    }
  });
})();
