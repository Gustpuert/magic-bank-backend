const fs = require("fs");
const path = require("path");

/**
 * Lee usuarios.json (SOLO LECTURA)
 */
function loadUsuarios() {
  const filePath = path.join(
    __dirname,
    "../../data/accesos/usuarios.json"
  );

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * A14 — Resolver acceso y destino
 */
exports.resolveAccess = (req, res) => {
  const email = req.user.email;

  const usuarios = loadUsuarios();

  const usuario = usuarios.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!usuario) {
    return res.status(403).json({
      error: "Acceso no autorizado"
    });
  }

  const now = new Date();
  const expiresAt = new Date(usuario.expires_at);

  if (expiresAt < now) {
    return res.status(403).json({
      error: "Acceso expirado"
    });
  }

  return res.status(200).json({
    email: usuario.email,
    nombre: usuario.nombre,
    destino: usuario.destino
  });
};
