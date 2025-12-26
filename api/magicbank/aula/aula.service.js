/**
 * Aula Service - MagicBank
 */

const { runTutor } = require("../../services/tutor.service");

async function runAula({ message, course_id, profile }) {
  console.log("🏫 [AULA] INICIO");
  console.log("📘 course_id:", course_id);
  console.log("💬 message:", message);

  try {
    console.log("🏫 [AULA] Llamando a tutor...");

    const response = await runTutor({
      course_id,
      message,
      profile
    });

    console.log("🏫 [AULA] Respuesta del tutor recibida");

    return {
      text: response.text,
      estado: "OK"
    };

  } catch (error) {
    console.error("🔥 ERROR EN AULA:", error.message);

    return {
      text: "El tutor tuvo un problema interno. Intenta nuevamente.",
      estado: "ERROR"
    };
  }
}

module.exports = {
  runAula
};
