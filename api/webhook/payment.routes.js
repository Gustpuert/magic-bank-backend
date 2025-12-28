/**
 * Payment Webhook - MagicBank
 * Registro automático post-pago
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

/* =========================
   PATHS
========================= */

const usersPath = path.join(
  process.cwd(),
  "data",
  "access",
  "users.json"
);

/* =========================
   UTILS
========================= */

function loadUsers() {
  if (!fs.existsSync(usersPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(usersPath, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

/* =========================
   MAPEO PRODUCTO → ACCESO
========================= */

function resolveAccess(productId) {
  const map = {
    "curso-cocina": "curso-cocina",
    "curso-ingles": "curso-ingles",
    "curso-frances": "curso-frances",
    "curso-aleman": "curso-aleman",
    "curso-portugues": "curso-portugues",
    "curso-italiano": "curso-italiano",
    "curso-chino": "curso-chino",

    "academy-completa": "academy",

    "facultad-administracion": "facultad-administracion",
    "facultad-derecho": "facultad-derecho",
    "facultad-contaduria": "facultad-contaduria",
    "facultad-marketing": "facultad-marketing",
    "facultad-software": "facultad-software",

    "trading-ciclico": "curso-trading",
    "pensiones-magicas": "curso-pensiones",
    "finanzas-completo": "finanzas-completo"
  };

  return map[productId] || null;
}

/* =========================
   WEBHOOK ENDPOINT
========================= */

router.post("/payment", (req, res) => {
  /**
   * Payload esperado (ejemplo TiendaNube):
   * {
   *   email: "alumno@email.com",
   *   product_id: "curso-ingles"
   * }
   */

  const { email, product_id } = req.body;

  if (!email || !product_id) {
    return res.status(400).json({
      ok: false,
      message: "Datos incompletos"
    });
  }

  const access = resolveAccess(product_id);

  if (!access) {
    return res.status(400).json({
      ok: false,
      message: "Producto no reconocido"
    });
  }

  const users = loadUsers();

  let user = users.find(u => u.email === email);

  if (!user) {
    user = {
      email,
      access: []
    };
    users.push(user);
  }

  if (!user.access.includes(access)) {
    user.access.push(access);
  }

  saveUsers(users);

  return res.status(200).json({
    ok: true,
    message: "Usuario registrado y acceso asignado",
    email,
    access
  });
});

module.exports = router;
