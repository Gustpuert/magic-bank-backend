const { createUser, generateJWT } = require("./auth.service");

async function register(req, res) {
  const { email, role, course } = req.body;

  if (!email || !role) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  const user = createUser({ email, role, course });
  const token = generateJWT(user);

  res.status(201).json({
    message: "Usuario registrado correctamente",
    token,
    user
  });
}

module.exports = {
  register
};
