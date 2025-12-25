const fs = require("fs");
const path = require("path");

/**
 * Tutor Service - MagicBank
 * Carga el system_prompt del tutor correcto
 */

async function runTutor({ message, profile, course_id }) {
  if (!course_id) {
    throw new Error("course_id no definido");
  }

  const tutorPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  if (!fs.existsSync(tutorPath)) {
    throw new Error(`System prompt no encontrado para tutor ${course_id}`);
  }

  const systemPrompt = fs.readFileSync(tutorPath, "utf-8");

  /**
   * ⚠️ PLACEHOLDER CONTROLADO
   * Aquí luego va OpenAI
   * Ahora solo validamos arquitectura y flujo
   */

  return {
    text: `Tutor (${course_id}) activo.\n\n${systemPrompt}\n\nMensaje recibido:\n${message}`
  };
}

module.exports = {
  runTutor
};
