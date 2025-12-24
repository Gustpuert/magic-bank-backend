const path = require("path");
const fs = require("fs");
const { runTutor } = require("../../services/tutor.service");

// === Cargar reglas pedagógicas ===
const reglasDecision = require(
  path.join(process.cwd(), "pedagogia", "reglas_decision")
);

// === Ruta canónica de cursos MagicBank Academy ===
const ACADEMY_COURSES_PATH = path.join(
  process.cwd(),
  "academic",
  "magicbank",
  "academy",
  "cursos"
);

// === Utilidad: cargar lista de cursos reales ===
function loadAcademyCourses() {
  if (!fs.existsSync(ACADEMY_COURSES_PATH)) return [];
  return fs
    .readdirSync(ACADEMY_COURSES_PATH)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

// === Resolver course_id de forma segura ===
function resolveCourseId({ message, course_id }) {
  const courses = loadAcademyCourses();

  // 1. Si viene un course_id válido, se respeta
  if (course_id && courses.includes(course_id)) {
    return course_id;
  }

  // 2. Intentar inferir desde el mensaje
  const lower = message.toLowerCase();
  const inferred = courses.find((c) =>
    lower.includes(c.replace(/_/g, " "))
  );

  if (inferred) {
    return inferred;
  }

  // 3. Fallback pedagógico seguro (NO inventado)
  return "artes_oficios";
}

// === Aula principal ===
async function runAula({ message, course_id, profile }) {
  if (!message) {
    throw new Error("Mensaje vacío");
  }

  const resolvedCourseId = resolveCourseId({ message, course_id });

  // Aplicación de reglas pedagógicas
  const decision = reglasDecision.evaluar({
    message,
    profile,
    course_id: resolvedCourseId,
  });

  // Tutor principal
  const response = await runTutor({
    course_id: resolvedCourseId,
    message: decision.message,
    profile,
  });

  return {
    text: response.text,
    course_id: resolvedCourseId,
    decision,
  };
}

module.exports = {
  runAula,
};
