/**
 * MAGICBANK — CONTACT ROUTES
 * Primer endpoint real de negocio
 *
 * Ruta:
 * POST /api/contact
 *
 * Fase:
 * - Recibe datos desde el frontend
 * - NO guarda en base de datos (fase segura)
 */

const express = require("express");
const router = express.Router();

// ===============================
// POST /api/contact
// ===============================

router.post("/contact", (req, res) => {
  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      status: "ERROR",
      message: "Datos incompletos"
    });
  }

  // Registro temporal (diagnóstico)
  console.log("📩 Nuevo contacto MagicBank");
  console.log({
    nombre,
    email,
    mensaje,
    fecha: new Date().toISOString()
  });

  return res.json({
    status: "OK",
    message: "Mensaje recibido correctamente"
  });
});

module.exports = router;
