const path = require("path");
const { runTutor } = require("../../services/tutor.service");
const { resolveAcademicEntity } = require("../../services/academic.loader");
const { evaluarExamen } = require("../../services/exam.engine");

const reglasDecision = require(
  path.join(process.cwd(), "pedagogia", "reglas_decision")
);

async function runAula({ message, course_id, profile }) {
  if (!message) throw new Error("Mensaje vacío");
  if (!course_id) throw new Error("course_id es obligatorio");

  const academicEntity = resolveAcademicEntity(course_id);
  if (!academicEntity) {
    throw new Error(`Entidad académica no existe: ${course_id}`);
  }

  // Estado académico del alumno (temporal, luego persistente)
  const estadoAlumno = {
    modulo_actual: profile?.modulo_actual || 1,
  };

  // Reglas pedagógicas
  const decision = reglasDecision.evaluar({
    message,
    profile,
    course_id,
    institucion: academicEntity.tipo,
  });

  // Tutor responde
  const response = await runTutor({
    course_id,
    message: decision.message,
    profile,
    academic: academicEntity,
  });

  // ⚠️ Simulación de veredicto (placeholder)
  // Luego vendrá desde el tutor
  let estadoFinal = estadoAlumno;

  if (academicEntity.tipo === "university" && decision.requiere_examen) {
    const resultado = decision.resultado_examen || null;
    if (resultado) {
      estadoFinal = evaluarExamen({
        resultado,
        estadoAlumno,
      });
    }
  }

  return {
    text: response.text,
    academic: {
      tipo: academicEntity.tipo,
      id: course_id,
    },
    estado_academico: estadoFinal,
    decision,
  };
}

module.exports = {
  runAula,
};
