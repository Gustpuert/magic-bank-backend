const paymentService = require("./payments.service");

async function paymentWebhook(req, res) {
  try {
    const secret = req.headers["x-magicbank-secret"];

    if (secret !== process.env.PAYMENT_WEBHOOK_SECRET) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const { email, course } = req.body;

    if (!email || !course) {
      return res.status(400).json({
        error: "Datos de pago incompletos"
      });
    }

    await paymentService.processPayment(email, course);

    return res.status(200).json({
      message: "Pago procesado y usuario registrado"
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}

module.exports = {
  paymentWebhook
};
