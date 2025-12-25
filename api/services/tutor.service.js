/**
 * Tutor Service - MagicBank
 * CommonJS compatible con Railway
 */

async function runTutor({ message, profile, course_id }) {

  // Valor por defecto seguro
  const resolvedCourse = course_id || "general";

  const response = `Tutor (${resolvedCourse}): recibí tu mensaje "${message}".`;

  return {
    response,
    course_id: resolvedCourse
  };
}

module.exports = {
  runTutor
};
