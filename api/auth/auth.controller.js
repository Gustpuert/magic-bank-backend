const authService = require("./auth.service");

function register(req, res) {
  try {
    const { email, password } = req.body;
    authService.registerUser(email, password);
    res.status(201).json({ message: "Usuario registrado" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = authService.loginUser(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

module.exports = {
  register,
  login
};
