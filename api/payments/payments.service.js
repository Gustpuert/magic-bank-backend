const crypto = require("crypto");
const axios = require("axios");

exports.processPayment = async (payload, headers) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;

  // Validación simple (puedes endurecer luego)
  if (!secret) throw new Error("Webhook secret no configurado");

  const { email, course } = payload;

  if (!email || !course) {
    throw new Error("Datos de pago incompletos");
  }

  const response = await axios.post(
    `${process.env.BASE_URL || "https://magic-bank-backend-production.up.railway.app"}/api/auth/register-auto`,
    { email, course }
  );

  return {
    status: "usuario_creado",
    redirect: response.data.redirectUrl
  };
};
