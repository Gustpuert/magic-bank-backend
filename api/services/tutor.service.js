/**
 * Tutor Service - MagicBank
 * Versión base funcional
 * Compatible con runAula
 * CommonJS (Railway)
 */

async function runTutor({ message, profile, course_id }) {
  // Valor por defecto seguro
  const resolvedCourse = course_id || "general";

  // Respuesta simulada (stub)
  // IMPORTANTE: devuelve `text`, no `response`
  const text = `Tutor (${resolvedCourse}): recibí tu mensaje "${message}".`;

  return {
    text,
    course_id: resolvedCourse
  };
}

module.exports = {
  runTutor
};
