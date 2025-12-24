const aulaService = require("./aula.service");

async function runAula(req, res) {
  try {
    const { course_id, message, profile } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensaje requerido" });
    }

    const response = await aulaService.runAula({
      course_id,
      message,
      profile,
    });

    res.json(response);
  } catch (error) {
    console.error("Error en runAula:", error);
    res.status(500).json({ error: "Error interno del aula" });
  }
}

module.exports = {
  runAula, // 👈 ESTO ES CLAVE
};
