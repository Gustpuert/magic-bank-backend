const { processAulaMessage } = require("./aula.service");

async function handleAulaMessage(req, res) {
  try {
    const { course_id, message, profile } = req.body;

    // Validación mínima correcta
    if (!course_id || !message) {
      return res.status(400).json({
        error: "Faltan datos requeridos: course_id o message"
      });
    }

    const response = await processAulaMessage({
      course_id,
      message,
      profile
    });

    res.json(response);

  } catch (error) {
    console.error("Error MagicBank Aula:", error.message);

    res.status(500).json({
      error: "Error interno del aula MagicBank"
    });
  }
}

module.exports = {
  handleAulaMessage
};
