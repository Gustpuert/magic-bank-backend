/**
 * MagicBank - Rutas protegidas
 */

const express = require("express");
const accesoPorCurso = require("./auth.middleware");

const router = express.Router();

/**
 * Ruta protegida por curso
 * Ejemplo:
 * GET /api/auth/curso?destino=https://chatgpt.com/g/g-XXXX
 */
router.get("/curso", accesoPorCurso, (req, res) => {
  res.json({
    mensaje: "Acceso concedido",
    usuario: {
      email: req.usuario.email,
      nombre: req.usuario.nombre,
      destino: req.usuario.destino,
      expires_at: req.usuario.expires_at
    }
  });
});

module.exports = router;
