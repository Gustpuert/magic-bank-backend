const express = require("express");
const router = express.Router();

const {
  register
} = require("./auth.controller");

/**
 * Registro de usuario
 * POST /api/auth/register
 */
router.post("/register", register);

module.exports = router;
