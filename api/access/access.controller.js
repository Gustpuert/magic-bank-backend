/**
 * Access Controller - MagicBank
 */

const fs = require("fs");
const path = require("path");

/**
 * Verifica si un usuario tiene acceso a un recurso
 * Recurso llega por query: ?recurso=academy.cocina
 */
function verificarAcceso(req, res) {
  try {
    const userId = req.user.id;
    const recurso = req.query.recurso;

    if (!recurso) {
      return res.status(400).json({
        ok: false,
        message: "Recurso no especificado"
      });
    }

    const accessPath = path.join(
      process.cwd(),
      "data",
      "accesos",
      "usuarios.json"
    );

    if (!fs.existsSync(accessPath)) {
      return res.status(500).json({
        ok: false,
        message: "Archivo de accesos no encontrado"
      });
    }

    const accesos = JSON.parse(
      fs.readFileSync(accessPath, "utf-8")
    );

    const usuario = accesos.find(u => u.id === userId);

    if (!usuario) {
      return res.status(403).json({
        ok: false,
        message: "Usuario sin accesos"
      });
    }

    const autorizado = usuario.accesos.includes(recurso);

    if (!autorizado) {
      return res.status(403).json({
        ok: false,
        message: "Acceso denegado"
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Acceso concedido",
      recurso
    });

  } catch (error) {
    console.error("Error access.controller:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno de acceso"
    });
  }
}

module.exports = {
  verificarAcceso
};
