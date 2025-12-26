const express = require("express");
const router = express.Router();

const controller = require("./aula.controller");
const { verificarAcceso } = require("../../auth/auth.middleware");

/**
 * Aula protegida
 * Solo entra quien pasó por login
 */
router.post(
  "/texto",
  verificarAcceso,
  controller.aulaTexto
);

module.exports = router;
