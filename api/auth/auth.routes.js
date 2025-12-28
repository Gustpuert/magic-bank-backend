const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

/**
 * DEV TOKEN – SOLO PRUEBAS
 * Genera un token válido para el curso INGLÉS
 */
router.get("/dev-token", (req, res) => {
  const payload = {
    user: {
      email: "test@magicbank.org",
      course: "ingles"
    }
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    ok: true,
    token
  });
});

/**
 * VERIFY TOKEN
 */
router.get("/verify", (req, res) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ error: "No token" });
  }

  const token = auth.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json(decoded);
  } catch (err) {
    res.status(401).json({ error: "Token inválido" });
  }
});

module.exports = router;
