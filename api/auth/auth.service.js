const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USERS_FILE = path.join(__dirname, "users.json");

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function registerUser(email, password) {
  const users = readUsers();

  if (users.find(u => u.email === email)) {
    throw new Error("El usuario ya existe");
  }

  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  const user = {
    id: Date.now(),
    email,
    password: hashedPassword,
    courses: [],
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  return {
    id: user.id,
    email: user.email
  };
}

module.exports = {
  registerUser
};
