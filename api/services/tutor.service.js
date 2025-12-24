async function runTutor({ context, message, profile }) {
  const name = profile?.preferred_name || "Estudiante";

  return {
    text: `Hola ${name}. En el curso de ${context}, te explico: ${message}`,
  };
}

module.exports = {
  runTutor,
};
