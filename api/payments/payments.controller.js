const { createUser, generateJWT } = require("../auth/auth.service");

async function paymentWebhook(req, res) {
  const { email, course } = req.body;

  // Validación webhook ya existente (firma, etc)

  const user = createUser({
    email,
    role: "student",
    course
  });

  const token = generateJWT(user);

  // 🔐 JWT listo para:
  // - redirección frontend
  // - tutor IA
  // - email automático

  res.status(200).json({
    message: "Pago confirmado y acceso creado",
    token,
    user
  });
}

module.exports = { paymentWebhook };
