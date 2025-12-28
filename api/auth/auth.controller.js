const authService = require("./auth.service");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const result = await authService.login({ email, password });

    return res.json(result);

  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}

module.exports = {
  login
};
