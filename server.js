const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Serve everything inside /public
app.use(express.static(path.join(__dirname, "public")));

// ✅ Serve index.html on root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Example API
app.get("/api/orders", (req, res) => {
  res.json({ total: 450 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
