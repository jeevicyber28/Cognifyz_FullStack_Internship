const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3001;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const WORKSHOPS = [
  { id: "node-apis", title: "Building REST APIs with Node & Express", seats: 40, room: "Lab 204" },
  { id: "sql-modeling", title: "Relational Database Design & SQL Basics", seats: 35, room: "Seminar Hall B" },
  { id: "git-workflows", title: "Git Branching, Rebasing & Code Reviews", seats: 50, room: "Auditorium Wing" }
];

const registrations = [
  {
    passCode: "WS-1041",
    fullName: "Ananya Krishnan",
    email: "ananya.k@college.edu",
    department: "Computer Science",
    year: "3rd Year",
    workshopId: "node-apis",
    workshopTitle: "Building REST APIs with Node & Express",
    attendanceMode: "In-person",
    notes: "Interested in middleware error handling patterns.",
    submittedAt: "2026-11-25 10:15 AM"
  },
  {
    passCode: "WS-1042",
    fullName: "Rohan Deshmukh",
    email: "rohan.d@college.edu",
    department: "Information Technology",
    year: "2nd Year",
    workshopId: "sql-modeling",
    workshopTitle: "Relational Database Design & SQL Basics",
    attendanceMode: "In-person",
    notes: "Bringing laptop with local SQLite setup.",
    submittedAt: "2026-11-25 11:40 AM"
  }
];

function nextPassCode() {
  return `WS-${1041 + registrations.length}`;
}

app.get("/", (req, res) => {
  res.render("index", {
    workshops: WORKSHOPS,
    totalRegistered: registrations.length,
    error: null,
    values: {}
  });
});

app.post("/register", (req, res) => {
  const fullName = (req.body.fullName || "").trim();
  const email = (req.body.email || "").trim();
  const department = (req.body.department || "").trim();
  const year = (req.body.year || "").trim();
  const workshopId = (req.body.workshopId || "").trim();
  const attendanceMode = (req.body.attendanceMode || "In-person").trim();
  const notes = (req.body.notes || "").trim();

  const selectedWorkshop = WORKSHOPS.find((w) => w.id === workshopId);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  if (!fullName || !validEmail || !department || !year || !selectedWorkshop) {
    return res.status(400).render("index", {
      workshops: WORKSHOPS,
      totalRegistered: registrations.length,
      error: "Please fill in your name, a valid email address, department, academic year, and select a workshop.",
      values: { fullName, email, department, year, workshopId, attendanceMode, notes }
    });
  }

  const entry = {
    passCode: nextPassCode(),
    fullName,
    email,
    department,
    year,
    workshopId: selectedWorkshop.id,
    workshopTitle: selectedWorkshop.title,
    room: selectedWorkshop.room,
    attendanceMode,
    notes: notes || "None provided",
    submittedAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    })
  };

  registrations.unshift(entry);

  res.render("confirmation", {
    registration: entry,
    totalRegistered: registrations.length
  });
});

app.get("/attendees", (req, res) => {
  const filterWorkshop = (req.query.workshop || "").trim();
  const filtered = filterWorkshop
    ? registrations.filter((r) => r.workshopId === filterWorkshop)
    : registrations;

  res.render("attendees", {
    registrations: filtered,
    workshops: WORKSHOPS,
    activeFilter: filterWorkshop
  });
});

app.listen(PORT, () => {
  console.log(`Task 1 SSR Workshop Desk running at http://localhost:${PORT}`);
});
