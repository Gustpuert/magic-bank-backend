/**
 * Access Routes - MagicBank
 * Controla acceso a cursos / facultades
 */

const express = require("express");
const router = express.Router();

const {
  verificarAcceso
} = require("./access.controller");

const authMiddleware = require("../auth/auth.middleware");

/**
 * Verifica si el usuario tiene acceso a un recurso
 * Recurso = curso | facultad | tutor
 */
router.get(
  "/check",
  authMiddleware,
  verificarAcceso
);

module.exports = router;
