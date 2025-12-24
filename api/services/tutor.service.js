async function runTutor({ course_id, message, profile }) {
  const name = profile?.preferred_name || "Estudiante";

  // Seguridad básica
  if (!course_id) {
    throw new Error("course_id no definido en runTutor");
  }

  return {
    text: `Hola ${name}. En el curso de ${course_id.replace(
      /_/g,
      " "
    )}, te explico: ${message}`,
  };
}

module.exports = {
  runTutor,
};
