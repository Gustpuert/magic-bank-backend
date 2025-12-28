const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifica JWT y adjunta req.user
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

/**
 * Control por rol
 */
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({
        error: "Acceso denegado por rol"
      });
    }
    next();
  };
}

/**
 * Control por curso/facultad
 * (el alumno solo accede a lo que pagó)
 */
function requireCourseMatch(req, res, next) {
  const requestedCourse = req.body.course_id || req.params.course_id;

  if (
    req.user.role === "student" &&
    requestedCourse &&
    req.user.course !== requestedCourse
  ) {
    return res.status(403).json({
      error: "No tienes acceso a este curso"
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireCourseMatch
};
