const crypto = require("crypto");
const {
  readUsers,
  writeUsers,
  generateToken
} = require("../auth/auth.service");

/**
 * Webhook de pago
 * Registra usuario automáticamente
 */
function paymentWebhook(req, res) {
  const signature = req.headers["x-payment-signature"];
  const payload = JSON.stringify(req.body);

  if (!signature) {
    return res.status(401).json({ error: "Firma faltante" });
  }

  // Verificación básica del webhook
  const expectedSignature = crypto
    .createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Firma inválida" });
  }

  /**
   * Payload esperado desde la pasarela:
   * {
   *   email: "usuario@email.com",
   *   product: "academy-ingles",
   *   role: "student"
   * }
   */
  const { email, product, role } = req.body;

  if (!email || !product) {
    return res.status(400).json({ error: "Datos de pago incompletos" });
  }

  const users = readUsers();
  const exists = users.find(u => u.email === email);

  if (exists) {
    return res.status(200).json({ message: "Usuario ya registrado" });
  }

  const user = {
    id: Date.now(),
    email,
    role: role || "student",
    course: product,
    createdAt: new Date().toISOString(),
    origin: "payment-webhook"
  };

  users.push(user);
  writeUsers(users);

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    course: user.course
  });

  return res.status(201).json({
    message: "Usuario creado automáticamente",
    token
  });
}

module.exports = { paymentWebhook };
