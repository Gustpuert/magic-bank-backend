const { runAula } = require("./aula.service");

async function aulaTexto(req, res) {
  try {
    const { message, course_id } = req.body;

    const result = await runAula({
      message,
      course_id,
      profile: req.user
    });

    res.json(result);
  } catch (error) {
    console.error("Aula error:", error);
    res.status(500).json({ error: "Error interno del aula" });
  }
}

module.exports = {
  aulaTexto
};
