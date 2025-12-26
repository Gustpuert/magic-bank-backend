/**
 * Middleware de protección de aula
 * MagicBank
 */

function verificarAcceso(req, res, next) {
  const acceso = req.headers["x-magicbank-acceso"];

  if (!acceso) {
    return res.status(401).json({
      error: "Acceso no autorizado"
    });
  }

  try {
    const permiso = JSON.parse(acceso);

    if (!permiso.tipo || !permiso.destino) {
      throw new Error("Permiso inválido");
    }

    req.magicbank = permiso;
    next();

  } catch (err) {
    return res.status(401).json({
      error: "Permiso corrupto"
    });
  }
}

module.exports = {
  verificarAcceso
};
