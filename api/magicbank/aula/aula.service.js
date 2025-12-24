async function runAula({ message, course_id, profile }) {
  if (!message) {
    throw new Error("Mensaje vacío");
  }

  const name = profile?.preferred_name || "Estudiante";

  // Respuesta mínima garantizada (para que NUNCA quede en silencio)
  return {
    text: `Hola ${name}. Recibí tu mensaje: "${message}". El aula MagicBank está operativa.`,
    meta: {
      course_id: course_id || "general",
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = {
  runAula,
};
