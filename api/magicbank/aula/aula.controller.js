const { procesarMensajeAula } = require("./aula.service");

/**
 * Controlador del Aula MagicBank
 * Punto de entrada HTTP para mensajes del aula
 */
async function enviarMensajeAula(req, res) {
  try {
    const {
      student_id,
      course_id,
      message,
      perfilAlumno
    } = req.body;

    // Validaciones mínimas
    if (!course_id || !message) {
      return res.status(400).json({
        error: "course_id y message son obligatorios"
      });
    }

    // Llamada al servicio central del aula
    const resultado = await procesarMensajeAula({
      student_id,
      course_id,
      message,
      perfilAlumno
    });

    // Respuesta normalizada para el frontend
    return res.json({
      ok: true,
      aula: {
        respuesta: resultado.respuesta,
        decision_pedagogica: resultado.decision_pedagogica,
        metricas: resultado.metricas_actualizadas
      }
    });

  } catch (error) {
    console.error("Error en aula.controller:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno del aula"
    });
  }
}

module.exports = {
  enviarMensajeAula
};
