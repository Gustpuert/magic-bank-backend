const {
  readUsers,
  writeUsers,
  generateToken,
  revokeToken
} = require("./auth.service");

function register(req, res) {
  const { email, role, course } = req.body;

  if (!email || !role || !course) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  const users = readUsers();
  const exists = users.find(u => u.email === email);

  if (exists) {
    return res.status(409).json({ error: "Usuario ya existe" });
  }

  const user = {
    id: Date.now(),
    email,
    role,
    course,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  writeUsers(users);

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    course: user.course
  });

  res.status(201).json({ token });
}

function logout(req, res) {
  const authHeader = req.headers.authorization;
  const token = authHeader.replace("Bearer ", "");

  revokeToken(token);

  res.json({ message: "Sesión cerrada correctamente" });
}

module.exports = { register, logout };
