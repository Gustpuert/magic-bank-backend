const express = require("express");
const router = express.Router();

const { paymentWebhook } = require("./payments.controller");

/**
 * WEBHOOK DE PAGO
 * SOLO POST
 */
router.post("/webhook", paymentWebhook);

module.exports = router;
