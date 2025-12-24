const { runTutor } = require("../../services/tutor.service");
const reglasDecision = require("../../../pedagogia/reglas_decision");

async function runAula({ message, course_id, profile }) {
  if (!message) {
    throw new Error("Mensaje vacío");
  }

  // Aplicación de reglas pedagógicas
  const decision = reglasDecision.evaluar({
    message,
    profile,
    course_id,
  });

  // Tutor principal
  const response = await runTutor({
    course_id,
    message: decision.message,
    profile,
  });

  return {
    text: response.text,
    decision,
  };
}

module.exports = {
  runAula,
};
