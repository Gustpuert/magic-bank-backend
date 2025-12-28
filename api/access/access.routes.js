const express = require("express");
const router = express.Router();
const { resolveAccess } = require("./access.controller");
const authMiddleware = require("../auth/auth.middleware");

/**
 * A14 — Resolver destino automáticamente
 * Requiere JWT válido
 */
router.get("/resolve", authMiddleware, resolveAccess);

module.exports = router;
