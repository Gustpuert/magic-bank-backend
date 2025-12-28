const express = require("express");
const router = express.Router();
const { generateTestToken } = require("./dev.controller");

/**
 * SOLO PARA DESARROLLO
 * Ejemplo:
 * /api/dev/token?course=italiano
 */
router.get("/token", generateTestToken);

module.exports = router;
