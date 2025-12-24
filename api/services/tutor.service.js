export async function runTutor({ message, profile, course_id }) {

  // Valor por defecto
  const resolvedCourse = course_id || "general";

  const response = `Tutor (${resolvedCourse}): recibí tu mensaje "${message}".`;

  return {
    response,
    course_id: resolvedCourse
  };
}
