/**
 * MagicBank - Middleware de acceso por curso
 * A13 - CLÁUSULA CANÓNICA
 */

const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const USERS_PATH = path.join(
  __dirname,
  "../../data/accesos/usuarios.json"
);

function accesoPorCurso(req, res, next) {
  try {
    // 1. Obtener token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token requerido" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token inválido" });
    }

    // 2. Verificar JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Leer usuarios
    const usuarios = JSON.parse(
      fs.readFileSync(USERS_PATH, "utf-8")
    );

    // 4. Buscar usuario válido
    const usuario = usuarios.find(u =>
      u.email === payload.email &&
      new Date(u.expires_at) > new Date()
    );

    if (!usuario) {
      return res.status(403).json({ error: "Acceso no autorizado o expirado" });
    }

    // 5. Validar destino (curso / tutor)
    const destinoSolicitado = req.query.destino;

    if (
      destinoSolicitado &&
      usuario.destino !== destinoSolicitado
    ) {
      return res.status(403).json({ error: "Acceso no corresponde a este curso" });
    }

    // 6. Inyectar usuario en request
    req.usuario = usuario;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

module.exports = accesoPorCurso;
