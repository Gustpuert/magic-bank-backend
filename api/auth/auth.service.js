const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "users.json");

/**
 * Lee usuarios desde archivo
 */
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(data);
}

/**
 * Guarda usuarios en archivo
 */
function saveUsers(users) {
  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify(users, null, 2)
  );
}

/**
 * Registro de usuario
 */
function registerUser({ email, password, role }) {
  const users = readUsers();

  const exists = users.find(u => u.email === email);
  if (exists) {
    throw new Error("El usuario ya existe");
  }

  const newUser = {
    id: Date.now(),
    email,
    password, // (luego se encripta)
    role: role || "student",
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role
  };
}

module.exports = {
  registerUser
};
