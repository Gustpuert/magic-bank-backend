const express = require("express");
const router = express.Router();

const { paymentWebhook } = require("./payments.controller");

/**
 * Webhook de pagos
 * POST /api/payments/webhook
 */
router.post("/webhook", paymentWebhook);

module.exports = router;
