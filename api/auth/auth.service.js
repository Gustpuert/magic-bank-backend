const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const usersPath = path.join(__dirname, "users.json");

function readUsers() {
  if (!fs.existsSync(usersPath)) return [];
  return JSON.parse(fs.readFileSync(usersPath, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

function registerUser(email, password) {
  const users = readUsers();

  const exists = users.find(u => u.email === email);
  if (exists) {
    throw new Error("Usuario ya existe");
  }

  const newUser = {
    id: Date.now(),
    email,
    password,
    courses: []
  };

  users.push(newUser);
  saveUsers(users);

  return newUser;
}

function loginUser(email, password) {
  const users = readUsers();
  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    throw new Error("Credenciales inválidas");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      courses: user.courses
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return { token };
}

module.exports = {
  registerUser,
  loginUser
};
