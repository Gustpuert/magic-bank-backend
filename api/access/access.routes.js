/**
 * Access Routes - MagicBank
 */

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

/* =========================
   UTILS
========================= */

function loadUsers() {
  const usersPath = path.join(
    process.cwd(),
    "data",
    "access",
    "users.json"
  );

  if (!fs.existsSync(usersPath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(usersPath, "utf-8"));
}

/* =========================
   MIDDLEWARE JWT
========================= */

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      ok: false,
      message: "Token requerido"
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      message: "Token inválido o expirado"
    });
  }
}

/* =========================
   CHECK ACCESS
========================= */

/**
 * POST /api/access/check
 * body: { resource: "academy" | "university" | "curso_id" }
 */
router.post("/check", verifyToken, (req, res) => {
  const { resource } = req.body;

  if (!resource) {
    return res.status(400).json({
      ok: false,
      message: "Recurso no especificado"
    });
  }

  const users = loadUsers();
  const user = users.find(u => u.email === req.user.email);

  if (!user) {
    return res.status(403).json({
      ok: false,
      message: "Usuario no registrado"
    });
  }

  const accesos = user.access || [];

  if (!accesos.includes(resource)) {
    return res.status(403).json({
      ok: false,
      message: "Acceso no autorizado"
    });
  }

  return res.status(200).json({
    ok: true,
    message: "Acceso autorizado"
  });
});

module.exports = router;
