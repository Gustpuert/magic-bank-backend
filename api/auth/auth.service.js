const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const USERS_PATH = path.join(process.cwd(), "data", "users.json");
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET no definido");
}

async function login({ email, password }) {
  const users = JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));

  const user = users.find(u => u.email === email);

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    throw new Error("Contraseña incorrecta");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      cursos: user.cursos
    },
    JWT_SECRET,
    {
      expiresIn: "3y"
    }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      cursos: user.cursos
    }
  };
}

module.exports = {
  login
};
