const aulaService = require("./aula.service");
const speechService = require("../../services/speech.service");

async function aulaTexto(req, res) {
  try {
    const result = await aulaService.runAula(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function aulaVoz(req, res) {
  try {
    const { audio_base64, course_id, profile } = req.body;

    const texto = await speechService.speechToText(audio_base64);

    const result = await aulaService.runAula({
      message: texto,
      course_id,
      profile,
    });

    res.json({
      ...result,
      texto_detectado: texto,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  aulaTexto,
  aulaVoz,
};
