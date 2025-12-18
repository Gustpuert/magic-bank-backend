/**
 * Middleware de autorización por rol
 * Fase 1: role simulado por header
 * Fase 2: JWT real
 */

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const role = req.headers["x-user-role"];

    if (!role) {
      return res.status(401).json({
        error: "Rol no proporcionado"
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: "Acceso no autorizado para este rol"
      });
    }

    req.userRole = role;
    next();
  };
}

module.exports = { requireRole };
