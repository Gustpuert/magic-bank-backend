const fs = require("fs");
const path = require("path");

const USERS_PATH = path.join(__dirname, "users.json");

function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(USERS_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

exports.createUser = async ({ email }) => {
  if (!email) throw new Error("Email requerido");

  const users = loadUsers();

  if (users.find(u => u.email === email)) {
    throw new Error("Usuario ya existe");
  }

  const user = {
    id: Date.now(),
    email,
    courses: [],
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  return user;
};
