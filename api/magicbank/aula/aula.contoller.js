const { runTutor } = require("./aula.service");

async function handleAulaMessage(req, res) {
  try {
    const { course_id, message, profile } = req.body;

    if (!course_id || !message || !profile) {
      return res.status(400).json({
        error: "Faltan datos requeridos"
      });
    }

    const response = await runTutor({
      course_id,
      message,
      profile
    });

    res.json(response);
  } catch (error) {
    console.error("Error MagicBank Aula:", error);
    res.status(500).json({
      error: "Error interno del aula MagicBank"
    });
  }
}

module.exports = {
  handleAulaMessage
};
