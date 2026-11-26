const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const tastingBookings = [];

app.post("/api/tasting", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const date = String(req.body.date || "").trim();
  const guests = Number(req.body.guests || 1);
  const roastPreference = String(req.body.roastPreference || "Filter Light").trim();

  if (name.length < 2 || !email.includes("@") || !date || !Number.isInteger(guests) || guests < 1 || guests > 8) {
    return res.status(400).json({
      ok: false,
      message: "Enter valid name, email, date, and party size (1-8)."
    });
  }

  const booking = {
    reference: `FP-${301 + tastingBookings.length}`,
    name,
    email,
    date,
    guests,
    roastPreference
  };
  tastingBookings.push(booking);

  res.status(201).json({
    ok: true,
    booking,
    message: `Table reserved under ${booking.reference} for ${booking.guests} guest(s) on ${booking.date}.`
  });
});

app.listen(PORT, () => {
  console.log(`Task 3 Responsive Showcase running at http://localhost:${PORT}`);
});
