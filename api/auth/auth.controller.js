const authService = require("./auth.service");

async function register(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña son obligatorios"
      });
    }

    const user = await authService.createUser({ email, password });

    return res.status(201).json({
      message: "Usuario creado correctamente",
      user: {
        email: user.email
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: error.message
    });
  }
}

module.exports = {
  register
};
