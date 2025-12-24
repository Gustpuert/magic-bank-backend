const express = require("express");
const router = express.Router();

const { enviarMensajeAula } = require("./aula.controller");

/**
 * Rutas del Aula MagicBank
 * Todas las interacciones del alumno pasan por aquí
 */

// Enviar mensaje al aula (tutor gobernado)
router.post("/", enviarMensajeAula);

// Ruta de prueba / salud del aula
router.get("/status", (req, res) => {
  res.json({
    ok: true,
    aula: "MagicBank Aula activa",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
