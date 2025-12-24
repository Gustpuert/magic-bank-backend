const path = require("path");
const { runTutor } = require("../../services/tutor.service");

// Ruta absoluta y segura
const reglasDecision = require(
  path.join(process.cwd(), "pedagogia", "reglas_decision")
);

async function runAula({ message, course_id, profile }) {
  if (!message) {
    throw new Error("Mensaje vacío");
  }

  const decision = reglasDecision.evaluar({
    message,
    profile,
    course_id,
  });

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
