const { runTutor } = require("../../services/tutor.service");

async function aulaController(req, res) {
  try {
    const { course_id, message, profile } = req.body;

    // Validaciones mínimas
    if (!course_id || !message) {
      return res.status(400).json({
        error: "course_id y message son obligatorios"
      });
    }

    // Llamada al tutor
    const response = await runTutor({
      course_id,
      message,
      profile
    });

    // RESPUESTA GARANTIZADA
    return res.json({
      success: true,
      text: response.text
    });

  } catch (error) {
    console.error("ERROR EN AULA:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message || "Error interno del aula"
    });
  }
}

module.exports = { aulaController };
