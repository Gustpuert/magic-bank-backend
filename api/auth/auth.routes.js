const express = require("express");
const router = express.Router();

const { register, logout } = require("./auth.controller");
const { authenticate } = require("./auth.middleware");

/* Registro automático (post-pago) */
router.post("/register", register);

/* Logout seguro */
router.post("/logout", authenticate, logout);

module.exports = router;
