const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "magicbank_secret";

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Token no proporcionado"
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          error: "Acceso no autorizado para este rol"
        });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        error: "Token inválido o expirado"
      });
    }
  };
}

module.exports = { requireRole };
