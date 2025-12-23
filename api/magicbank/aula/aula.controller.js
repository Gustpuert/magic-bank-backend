const { runTutor } = require("./aula.service");

async function handleAulaMessage(req, res) {
  try {
    const { course_id, message, profile } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: "Falta course_id" });
    }

    if (!message) {
      return res.status(400).json({ error: "Falta message" });
    }

    if (!profile) {
      return res.status(400).json({ error: "Falta profile" });
    }

    const response = await runTutor({
      course_id,
      message,
      profile
    });

    return res.json(response);

  } catch (error) {
    console.error("❌ ERROR REAL AULA:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}

module.exports = {
  handleAulaMessage
};
