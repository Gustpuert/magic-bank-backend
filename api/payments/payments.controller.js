const crypto = require("crypto");
const { createUserIfNotExists, assignCourse } = require("../auth/auth.service");
const { sendAccessEmail } = require("../../services/email.service");

exports.paymentWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    const signature = req.headers["x-signature"];

    if (!signature || signature !== secret) {
      return res.status(401).json({ error: "Webhook no autorizado" });
    }

    const { email, name, course } = req.body;

    if (!email || !course) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const user = await createUserIfNotExists({ email, name });
    await assignCourse(email, course);

    await sendAccessEmail(email, course);

    return res.status(200).json({ status: "OK" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno" });
  }
};
