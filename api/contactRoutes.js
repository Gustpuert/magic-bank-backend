/**
 * MAGICBANK — CONTACT ROUTES (CANÓNICO)
 * Primer endpoint de negocio
 * Función: recibir mensajes de contacto desde el frontend
 */

const express = require("express");
const router = express.Router();

// ===============================
// POST /api/contact
// ===============================
// Recibe:
// - nombre
// - email
// - mensaje
// Por ahora NO guarda en DB (fase segura)

router.post("/contact", (req, res) => {
  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      status: "ERROR",
      message: "Datos incompletos"
    });
  }

  console.log("📩 Nuevo contacto MagicBank:");
  console.log({ nombre, email, mensaje });

  return res.json({
    status: "OK",
    message: "Mensaje recibido correctamente"
  });
});

module.exports = router;
