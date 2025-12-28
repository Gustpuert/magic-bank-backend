const express = require("express");
const router = express.Router();

const { register } = require("./auth.controller");

/**
 * Registro manual (fallback)
 */
router.post("/register", register);

module.exports = router;
