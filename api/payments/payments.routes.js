const express = require("express");
const router = express.Router();

const { paymentWebhook } = require("./payments.controller");

router.post("/webhook", paymentWebhook);

module.exports = router;
