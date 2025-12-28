const express = require("express");
const router = express.Router();
const controller = require("./auth.controller");

/*
  Registro automático post-pago
*/
router.post("/register", controller.register);

/*
  Login (lo haremos en A7.3)
*/
// router.post("/login", controller.login);

module.exports = router;
