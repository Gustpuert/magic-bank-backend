const fs = require("fs");
const path = require("path");

/**
 * Ruta absoluta al archivo de accesos
 * data/accesos/usuarios.json
 */
const ACCESS_FILE = path.join(
  __dirname,
  "../../data/accesos/usuarios.json"
);

/**
 * GET /api/access/check
 * Requiere JWT válido (auth.middleware)
 */
function checkAccess(req, res) {
  try {
    const userEmail = req.user.email;

    if (!userEmail) {
      return res.status(401).json({
        ok: false,
        error: "Usuario no identificado"
      });
    }

    // Leer archivo de accesos
    const rawData = fs.readFileSync(ACCESS_FILE, "utf8");
    const usuarios = JSON.parse(rawData);

    // Buscar usuario
    const acceso = usuarios.find(u => u.email === userEmail);

    if (!acceso) {
      return res.status(403).json({
        ok: false,
        error: "Acceso no autorizado"
      });
    }

    // Validar expiración
    const ahora = new Date();
    const expiracion = new Date(acceso.expires_at);

    if (ahora > expiracion) {
      return res.status(403).json({
        ok: false,
        error: "Acceso expirado"
      });
    }

    // Acceso válido
    return res.status(200).json({
      ok: true,
      destino: acceso.destino,
      usuario: {
        email: acceso.email,
        nombre: acceso.nombre
      }
    });

  } catch (error) {
    console.error("Error checkAccess:", error);

    return res.status(500).json({
      ok: false,
      error: "Error interno de acceso"
    });
  }
}

module.exports = {
  checkAccess
};
