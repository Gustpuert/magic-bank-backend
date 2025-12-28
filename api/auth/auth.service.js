const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const USERS_FILE = path.join(__dirname, "users.json");
const JWT_SECRET = process.env.JWT_SECRET;

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function createUser({ email, role, course }) {
  const users = loadUsers();

  const exists = users.find(u => u.email === email);
  if (exists) return exists;

  const newUser = {
    id: Date.now(),
    email,
    role,
    course,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return newUser;
}

function generateJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      course: user.course
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

module.exports = {
  createUser,
  generateJWT
};
