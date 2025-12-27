const authService = require("./auth.service");

/**
 * Controlador de registro
 */
async function register(req, res) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email y password son obligatorios"
      });
    }

    const user = authService.registerUser({
      email,
      password,
      role
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      user
    });

  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
}

module.exports = {
  register
};
