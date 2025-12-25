const fs = require("fs");
const path = require("path");
const { runTutor } = require("../../services/tutor.service");

/**
 * Aula MagicBank
 * Función: enrutar mensaje al tutor correcto
 * NO decide pedagogía
 * NO controla módulos
 * NO evalúa
 * NO certifica
 */

async function runAula({ message, course_id, faculty, profile }) {
  if (!message) {
    throw new Error("Mensaje vacío");
  }

  let tutorId;
  let tutorType;

  // =========================
  // DETERMINAR TIPO DE TUTOR
  // =========================

  if (course_id) {
    tutorType = "academy";
    tutorId = course_id;
  } else if (faculty) {
    tutorType = "university";
    tutorId = faculty;
  } else {
    throw new Error("No se especificó curso ni facultad");
  }

  // =========================
  // RESOLVER SYSTEM PROMPT
  // =========================

  const promptPath = path.join(
    process.cwd(),
    "tutors",
    tutorType,
    tutorId,
    "system_prompt.txt"
  );

  if (!fs.existsSync(promptPath)) {
    throw new Error(`System prompt no encontrado para ${tutorType}/${tutorId}`);
  }

  const systemPrompt = fs.readFileSync(promptPath, "utf-8");

  // =========================
  // LLAMADA AL TUTOR REAL
  // =========================

  const response = await runTutor({
    systemPrompt,
    message,
    profile
  });

  return {
    text: response.text
  };
}

module.exports = {
  runAula
};
