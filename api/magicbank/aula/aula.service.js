const path = require("path");
const { runTutor } = require("../../services/tutor.service");
const { resolveAcademicEntity } = require("../../services/academic.loader");
const { evaluarExamen } = require("../../services/exam.engine");
const {
  getStudentProgress,
  updateStudentProgress,
} = require("../../services/student.progress.store");
const { extraerVeredicto } = require("../../services/veredicto.parser");

const reglasDecision = require(
  path.join(process.cwd(), "pedagogia", "reglas_decision")
);

async function runAula({ message, course_id, profile }) {
  if (!message) throw new Error("Mensaje vacío");
  if (!course_id) throw new Error("course_id es obligatorio");

  const studentId =
    profile?.student_id || profile?.preferred_name || "anonimo";

  // 1️⃣ Validación académica
  const academicEntity = resolveAcademicEntity(course_id);
  if (!academicEntity) {
    throw new Error(`Entidad académica no existe: ${course_id}`);
  }

  // 2️⃣ Cargar progreso persistido
  const progreso = getStudentProgress(studentId, course_id);

  // 3️⃣ Reglas pedagógicas
  const decision = reglasDecision.evaluar({
    message,
    profile: {
      ...profile,
      modulo_actual: progreso.modulo_actual,
    },
    course_id,
    institucion: academicEntity.tipo,
  });

  // 4️⃣ Tutor responde
  const response = await runTutor({
    course_id,
    message: decision.message,
    profile,
    academic: academicEntity,
  });

  // 5️⃣ Extraer veredicto institucional
  const veredicto = extraerVeredicto(response.text);

  let estadoFinal = progreso;

  // 6️⃣ Ejecutar decisión institucional (University)
  if (
    academicEntity.tipo === "university" &&
    decision.requiere_examen &&
    veredicto
  ) {
    estadoFinal = evaluarExamen({
      resultado: veredicto,
      estadoAlumno: progreso,
    });

    updateStudentProgress(studentId, course_id, estadoFinal);
  }

  return {
    text: response.text.replace(/\[VEREDICTO\][\s\S]*?\[\/VEREDICTO\]/i, "").trim(),
    academic: {
      tipo: academicEntity.tipo,
      id: course_id,
    },
    progreso: estadoFinal,
    veredicto,
    decision,
  };
}

module.exports = {
  runAula,
};
