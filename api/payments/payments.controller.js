const crypto = require("crypto");
const { grantAccess } = require("../access/access.service");

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET;

function verifySignature(req) {
  const signature = req.headers["x-webhook-signature"];
  if (!signature) return false;

  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return hash === signature;
}

async function paymentWebhook(req, res) {
  try {
    if (!verifySignature(req)) {
      return res.status(401).json({ error: "Firma inválida" });
    }

    const { email, product } = req.body;

    if (!email || !product) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    await grantAccess(email, product);

    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Error interno" });
  }
}

module.exports = { paymentWebhook };
