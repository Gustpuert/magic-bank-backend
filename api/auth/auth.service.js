const path = require("path");
const fs = require("fs");

const usersPath = path.join(
  process.cwd(),
  "api",
  "auth",
  "users.json"
);

function login({ email, password }) {

  if (!fs.existsSync(usersPath)) {
    throw new Error("Sistema de usuarios no inicializado");
  }

  const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    throw new Error("Credenciales inválidas");
  }

  // ⏱️ Verificación de vencimiento
  const now = new Date();
  const expires = new Date(user.expires_at);

  if (now > expires) {
    throw new Error("Acceso vencido");
  }

  return {
    message: "Acceso concedido",
    redirect: user.redirect
  };
}

module.exports = {
  login
};
