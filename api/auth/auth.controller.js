const authService = require("./auth.service");

/**
 * REGISTER
 */
async function registerUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email y password son obligatorios"
      });
    }

    const user = await authService.register(email, password);

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

/**
 * LOGIN
 */
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email y password son obligatorios"
      });
    }

    const user = await authService.login(email, password);

    return res.status(200).json({
      message: "Login exitoso",
      user
    });

  } catch (error) {
    return res.status(401).json({
      error: error.message
    });
  }
}

module.exports = {
  registerUser,
  loginUser
};
