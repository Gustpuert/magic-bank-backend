const express = require("express");
const router = express.Router();
const { register } = require("./auth.controller");

/**
 * POST /api/auth/register
 * Registro + JWT automático
 */
router.post("/register", register);

module.exports = router;
