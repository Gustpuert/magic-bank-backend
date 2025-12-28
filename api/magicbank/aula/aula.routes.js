const express = require("express");
const router = express.Router();

const { aulaTexto } = require("./aula.controller");
const {
  requireAuth,
  requireRole,
  requireCourseMatch
} = require("../auth/auth.middleware");

/**
 * Aula protegida:
 * - requiere login
 * - solo estudiantes
 * - solo su curso
 */
router.post(
  "/texto",
  requireAuth,
  requireRole("student"),
  requireCourseMatch,
  aulaTexto
);

module.exports = router;
