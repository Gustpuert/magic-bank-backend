const fs = require("fs");
const path = require("path");

const usersPath = path.join(__dirname, "users.json");

function loadUsers() {
  return JSON.parse(fs.readFileSync(usersPath, "utf-8")).users;
}

function validarLogin(email, password) {
  const users = loadUsers();
  const user = users.find(
    u => u.email === email && u.password === password && u.activo
  );

  if (!user) return null;

  const hoy = new Date();
  const expira = new Date(user.expira);

  if (hoy > expira) return null;

  return user;
}

module.exports = {
  validarLogin
};
