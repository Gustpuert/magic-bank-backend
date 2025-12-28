const express = require("express");
const router = express.Router();
const authMiddleware = require("./auth.middleware");
const fs = require("fs");
const path = require("path");

const usersFile = path.join(__dirname, "users.json");

function readUsers() {
  return JSON.parse(fs.readFileSync(usersFile, "utf8"));
}

/**
 * Verificar acceso a curso
 * GET /api/auth/access/:course
 */
router.get("/access/:course", authMiddleware, (req, res) => {
  const { email } = req.user;
  const { course } = req.params;

  const users = readUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(403).json({ access: false });
  }

  const hasAccess = user.courses.includes(course);

  return res.json({ access: hasAccess });
});

module.exports = router;
