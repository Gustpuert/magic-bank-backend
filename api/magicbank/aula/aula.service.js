const path = require("path");
const { runTutor } = require("../../services/tutor.service");
const { resolveAcademicEntity } = require("../../services/academic.loader");
const { evaluarExamen } = require("../../services/exam.engine");
const {
  getStudentProgress,
  updateStudentProgress,
} = require("../../services/student.progress.store");

const reglasDecision = require(
  path.join(process.cwd(), "pedagogia", "reglas_decision")
);

async function runAula({ message, course_id, profile }) {
  if (!message) throw new Error("Mensaje vacío");
  if (!course_id) throw new Error("course_id es obligatorio");

  const studentId =
    profile?.student_id || profile?.preferred_name || "anonimo";

  // Validación académica
  const academicEntity = resolveAcademicEntity(course_id);
  if (!academicEntity) {
    throw new Error(`Entidad académica no existe: ${course_id}`);
  }

  // 📌 Cargar progreso persistido
  const progreso = getStudentProgress(studentId, course_id);

  // Reglas pedagógicas
  const decision = reglasDecision.evaluar({
    message,
    profile: {
      ...profile,
      modulo_actual: progreso.modulo_actual,
    },
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

  let estadoFinal = progreso;

  // 🧪 University: aplicar resultado de examen si existe
  if (
    academicEntity.tipo === "university" &&
    decision.requiere_examen &&
    decision.resultado_examen
  ) {
    estadoFinal = evaluarExamen({
      resultado: decision.resultado_examen,
      estadoAlumno: progreso,
    });

    // Persistir
    updateStudentProgress(studentId, course_id, estadoFinal);
  }

  return {
    text: response.text,
    academic: {
      tipo: academicEntity.tipo,
      id: course_id,
    },
    progreso: estadoFinal,
    decision,
  };
}

module.exports = {
  runAula,
};
