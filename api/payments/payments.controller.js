const { processTiendaNubePayment } = require("./payments.service");

exports.tiendaNubeWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-linkedstore-hmac-sha256"];
    const payload = JSON.stringify(req.body);

    if (!signature) {
      return res.status(401).json({ error: "Firma faltante" });
    }

    await processTiendaNubePayment(signature, payload);

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(400).json({ error: "Webhook inválido" });
  }
};
