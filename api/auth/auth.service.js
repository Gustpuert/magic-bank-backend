const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "users.json");

/**
 * Helpers
 */
function readUsers() {
  const data = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(data);
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * REGISTER
 */
async function register(email, password) {
  const users = readUsers();

  const exists = users.find(u => u.email === email);
  if (exists) {
    throw new Error("El usuario ya existe");
  }

  const newUser = {
    id: Date.now(),
    email,
    password,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return {
    id: newUser.id,
    email: newUser.email
  };
}

/**
 * LOGIN
 */
async function login(email, password) {
  const users = readUsers();

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    throw new Error("Credenciales inválidas");
  }

  return {
    id: user.id,
    email: user.email
  };
}

module.exports = {
  register,
  login
};
