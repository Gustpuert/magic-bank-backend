const express = require("express");
const router = express.Router();
const { generateJWT } = require("./auth.service");

router.post("/token", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  const token = generateJWT(email);
  res.json({ token });
});

module.exports = router;
