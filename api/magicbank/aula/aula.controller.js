/**
 * Aula Controller
 * Recibe texto del tutor y lo pasa a la CEA.
 * El aula NO decide nada.
 */

const { runAula } = require("./aula.service");
const { runCEA } = require("../cea/cea.service");

async function aulaTexto(req, res) {
  try {
    const { message, course_id, profile } = req.body;

    const tutorResult = await runAula({
      message,
      course_id,
      profile
    });

    const ceaResult = runCEA({
      text: tutorResult.text,
      tutor_id: course_id
    });

    res.json({
      ok: true,
      tutor: tutorResult,
      cea: ceaResult
    });

  } catch (err) {
    console.error("Aula error:", err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}

module.exports = {
  aulaTexto
};
