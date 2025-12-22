const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Students API activa" });
});

module.exports = router;
