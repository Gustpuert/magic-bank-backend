const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USERS_FILE = path.join(__dirname, "users.json");

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}

async function login(email, password) {
  const users = readUsers();

  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  const user = users.find(
    u => u.email === email && u.password === hashedPassword
  );

  if (!user) {
    throw new Error("Credenciales inválidas");
  }

  return {
    id: user.id,
    email: user.email,
    courses: user.courses
  };
}

module.exports = {
  login
};
