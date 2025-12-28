const express = require("express");
const router = express.Router();

const { paymentWebhook } = require("./payment.webhook");

/* =========================
   WEBHOOK PAGO
========================= */
router.post("/payment/webhook", paymentWebhook);

module.exports = router;
