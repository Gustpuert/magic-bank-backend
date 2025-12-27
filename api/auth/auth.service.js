const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const usersPath = path.join(process.cwd(), "data", "users.json");

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

async function createUser({ email, password }) {
  if (!fs.existsSync(usersPath)) {
    throw new Error("Archivo de usuarios no encontrado");
  }

  const data = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

  const exists = data.users.find(u => u.email === email);
  if (exists) {
    throw new Error("El usuario ya existe");
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    password: hashPassword(password),
    created_at: new Date().toISOString(),
    active: true
  };

  data.users.push(user);

  fs.writeFileSync(usersPath, JSON.stringify(data, null, 2));

  return user;
}

module.exports = {
  createUser
};
