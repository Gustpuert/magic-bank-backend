const loginService = require("./login.service");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Credenciales incompletas"
      });
    }

    const result = await loginService.login({ email, password });

    return res.json(result);

  } catch (error) {
    return res.status(401).json({
      error: error.message
    });
  }
}

module.exports = {
  login
};
