const authService = require("./auth.service");

async function register(req, res) {
  try {
    const {
      email,
      password,
      course_id,
      source // "academy" | "university"
    } = req.body;

    if (!email || !password || !course_id || !source) {
      return res.status(400).json({
        error: "Datos incompletos para registro"
      });
    }

    const user = await authService.registerUser({
      email,
      password,
      course_id,
      source
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      user_id: user.id,
      course_id
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}

module.exports = {
  register
};
