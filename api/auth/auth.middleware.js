/**
 * Auth Middleware - MagicBank
 * Ruta oficial: api/auth/auth.middleware.js
 */

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "No autorizado: token ausente"
    });
  }

  const token = authHeader.replace("Bearer ", "");

  // 🔐 Fase inicial: token único (luego JWT por curso)
  if (token !== process.env.MAGICBANK_ACCESS_TOKEN) {
    return res.status(403).json({
      error: "Token inválido"
    });
  }

  next();
};
