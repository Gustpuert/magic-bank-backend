const authService = require("./auth.service");

async function login(req, res) {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({
        ok: false,
        error: "FALTAN_CREDENCIALES"
      });
    }

    const result = await authService.login({ usuario, password });

    return res.json(result);

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(401).json({
      ok: false,
      error: error.message
    });
  }
}

module.exports = {
  login
};
