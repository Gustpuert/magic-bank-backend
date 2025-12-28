const jwt = require("jsonwebtoken");
const { isTokenRevoked } = require("./auth.service");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.replace("Bearer ", "");

  if (isTokenRevoked(token)) {
    return res.status(401).json({ error: "Token revocado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

module.exports = { authenticate };
