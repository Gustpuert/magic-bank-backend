const { processPayment } = require("./payments.service");

exports.paymentWebhook = async (req, res) => {
  try {
    const result = await processPayment(req.body, req.headers);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
