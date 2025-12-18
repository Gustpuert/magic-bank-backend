const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

/**
 * ===================================
 * USUARIOS (FASE 1 SIMULADA)
 * ===================================
 * En producción → PostgreSQL
 */

const users = [
  {
    id: "12345",
    email: "student@magicbank.com",
    password: "student123",
    role: "student"
  },
  {
    id: "tutor1",
    email: "tutor@magicbank.com",
    password: "tutor123",
    role: "tutor"
  },
  {
    id: "admin1",
    email: "admin@magicbank.com",
    password: "admin123",
    role: "admin"
  }
];

const JWT_SECRET = process.env.JWT_SECRET || "magicbank_secret";

/**
 * ===================================
 * LOGIN
 * POST /api/auth/login
 * ===================================
 */
router.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      error: "Credenciales inválidas"
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    token,
    role: user.role,
    user_id: user.id
  });
});

module.exports = router;
