const express = require("express");
const router = express.Router();
const controller = require("./auth.controller");

/**
 * Registro automático post-pago
 */
router.post("/post-payment", controller.postPaymentLogin);

module.exports = router;
