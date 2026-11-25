/*
  Perch: the café list.
  Only cafés the owner has tried. Nothing researched, nothing guessed.

  One café:
  {
    id: "short-id",
    name: "Café name",
    area: "Clerkenwell",
    address: "12 Example Street, EC1R 4QE",
    lat: 51.52, lng: -0.11,          // placed from the address she gives
    hours: {                          // 24h, [] = closed that day
      mon: [["08:00", "17:00"]], tue: [...], wed: [...], thu: [...],
      fri: [...], sat: [...], sun: []
    },
    laptop: {
      default: true,                  // laptops OK whenever open, unless a rule says otherwise
      rules: [                        // later rules win
        { days: ["sat", "sun"], allowed: false },
        { days: ["sat"], from: "08:00", to: "12:00", allowed: true }
      ]
    },
    wifi: "Good", sockets: "A few", noise: "Calm", coffee: "Great flat white",  // all optional
    note: "Own words about the place",                                         // optional
    visited: "2026-11-25"
  }

  Entries with example: true only show while the list has no real café.
*/
window.PERCH = {
  updated: "2026-11-25",
  cafes: [
    {
      id: "example-long-table",
      example: true,
      name: "Long Table",
      area: "Clerkenwell",
      address: "Exmouth Market, EC1R",
      lat: 51.5262, lng: -0.1093,
      hours: {
        mon: [["07:30", "17:00"]], tue: [["07:30", "17:00"]], wed: [["07:30", "17:00"]],
        thu: [["07:30", "17:00"]], fri: [["07:30", "17:00"]],
        sat: [["09:00", "17:00"]], sun: [["09:00", "16:00"]]
      },
      laptop: { default: true, rules: [{ days: ["sat", "sun"], allowed: false }] },
      wifi: "Good", sockets: "Along the back wall", noise: "Calm in the morning",
      note: "Big shared table at the back, ask for the corner seat.",
      visited: "2026-11-25"
    },
    {
      id: "example-window-seat",
      example: true,
      name: "Window Seat",
      area: "Shoreditch",
      address: "Redchurch Street, E2",
      lat: 51.5243, lng: -0.0742,
      hours: {
        mon: [["08:00", "19:00"]], tue: [["08:00", "19:00"]], wed: [["08:00", "19:00"]],
        thu: [["08:00", "19:00"]], fri: [["08:00", "19:00"]],
        sat: [["09:00", "19:00"]], sun: [["09:00", "18:00"]]
      },
      laptop: { default: true, rules: [{ from: "12:00", to: "14:00", allowed: false }] },
      wifi: "Fast", noise: "Lively at lunch", coffee: "Good oat flat white",
      visited: "2026-11-25"
    },
    {
      id: "example-back-room",
      example: true,
      name: "Back Room",
      area: "Marylebone",
      address: "Marylebone Lane, W1",
      lat: 51.5165, lng: -0.1496,
      hours: {
        mon: [["08:00", "18:00"]], tue: [["08:00", "18:00"]], wed: [["08:00", "18:00"]],
        thu: [["08:00", "18:00"]], fri: [["08:00", "18:00"]],
        sat: [["08:30", "18:00"]], sun: []
      },
      laptop: { default: true, rules: [{ days: ["sat"], from: "12:00", allowed: false }] },
      sockets: "Most tables", noise: "Very quiet",
      visited: "2026-11-25"
    }
  ]
};
