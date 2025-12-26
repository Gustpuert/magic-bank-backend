const fs = require("fs");
const path = require("path");
const { verifyPassword } = require("../../utils/password");

const USERS_PATH = path.join(
  process.cwd(),
  "data",
  "accesos",
  "usuarios.json"
);

async function login({ email, password }) {
  if (!fs.existsSync(USERS_PATH)) {
    throw new Error("Base de accesos no disponible");
  }

  const users = JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));

  const user = users.find(u => u.email === email);

  if (!user) {
    throw new Error("Usuario no autorizado");
  }

  const validPassword = await verifyPassword(password, user.password_hash);

  if (!validPassword) {
    throw new Error("Credenciales inválidas");
  }

  const now = new Date();
  const expires = new Date(user.expires_at);

  if (now > expires) {
    throw new Error("Acceso vencido");
  }

  return {
    ok: true,
    destino: user.destino,
    nombre: user.nombre,
    expires_at: user.expires_at
  };
}

module.exports = {
  login
};
