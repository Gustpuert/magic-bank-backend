const express = require("express");
const router = express.Router();

const { tiendaNubeWebhook } = require("./payments.controller");

/**
 * Webhook TiendaNube
 * SOLO POST
 */
router.post("/tiendanube", tiendaNubeWebhook);

module.exports = router;
