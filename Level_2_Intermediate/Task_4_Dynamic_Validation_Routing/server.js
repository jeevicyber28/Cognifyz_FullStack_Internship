const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.static(path.join(__dirname, "public")));

app.get(["/onboarding", "/directory", "/policy"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Task 4 Onboarding & Client Router running at http://localhost:${PORT}`);
});
