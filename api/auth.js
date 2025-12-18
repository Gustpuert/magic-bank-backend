const express = require("express");
const router = express.Router();

/**
 * AUTENTICACIÓN SIMULADA – FASE 1
 * Luego se conecta a PostgreSQL sin cambiar la API
 */

// Usuarios simulados (estudiantes)
const users = [
  {
    student_id: "12345",
    email: "estudiante@magicbank.org",
    password: "123456",
    status: "active"
  },
  {
    student_id: "67890",
    email: "inactivo@magicbank.org",
    password: "123456",
    status: "inactive"
  }
];

/**
 * LOGIN
 * POST /api/login
 */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email y contraseña requeridos"
    });
  }

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      error: "Credenciales inválidas"
    });
  }

  if (user.status !== "active") {
    return res.status(403).json({
      error: "Usuario inactivo"
    });
  }

  res.json({
    student_id: user.student_id,
    status: user.status,
    message: "Login exitoso"
  });
});

module.exports = router;
