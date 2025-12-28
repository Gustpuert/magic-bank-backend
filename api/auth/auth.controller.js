const { createUser, generateJWT } = require("./auth.service");

/**
 * POST /api/auth/post-payment
 * Llamado después del pago exitoso
 */
async function postPaymentLogin(req, res) {
  try {
    const { email, course_id } = req.body;

    if (!email || !course_id) {
      return res.status(400).json({
        error: "Email y curso son obligatorios"
      });
    }

    // 1️⃣ Crear usuario si no existe
    const user = createUser({
      email,
      role: "student",
      course: course_id
    });

    // 2️⃣ Generar token
    const token = generateJWT(user);

    // 3️⃣ URL de destino automática
    const redirectUrl = `https://aula.magicbank.org/?token=${token}`;

    // 4️⃣ Respuesta limpia para redirección
    res.json({
      success: true,
      redirect: redirectUrl
    });

  } catch (error) {
    console.error("Post payment error:", error);
    res.status(500).json({
      error: "Error en registro post-pago"
    });
  }
}

module.exports = {
  postPaymentLogin
};
