const { validarLogin } = require("./auth.service");

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Credenciales incompletas"
    });
  }

  const user = validarLogin(email, password);

  if (!user) {
    return res.status(401).json({
      error: "Acceso denegado"
    });
  }

  return res.json({
    acceso: true,
    nombre: user.nombre,
    tipo: user.acceso.tipo,
    destino: user.acceso
  });
}

module.exports = {
  login
};
