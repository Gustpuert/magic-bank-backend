const path = require("path");
const { runTutor } = require("../../services/tutor.service");
const { resolveAcademicEntity } = require("../../services/academic.loader");

const reglasDecision = require(
  path.join(process.cwd(), "pedagogia", "reglas_decision")
);

async function runAula({ message, course_id, profile }) {
  if (!message) {
    throw new Error("Mensaje vacío");
  }

  if (!course_id) {
    throw new Error("course_id es obligatorio");
  }

  // 🔒 Validación académica canónica
  const academicEntity = resolveAcademicEntity(course_id);

  if (!academicEntity) {
    throw new Error(`Curso o facultad no existe en MagicBank: ${course_id}`);
  }

  // Aplicar reglas pedagógicas
  const decision = reglasDecision.evaluar({
    message,
    profile,
    course_id,
    institucion: academicEntity.tipo,
  });

  // Tutor
  const response = await runTutor({
    course_id,
    message: decision.message,
    profile,
    academic: academicEntity,
  });

  return {
    text: response.text,
    academic: {
      tipo: academicEntity.tipo,
      id: course_id,
      nombre: academicEntity.data.nombre || academicEntity.data.facultad,
    },
    decision,
  };
}

module.exports = {
  runAula,
};
