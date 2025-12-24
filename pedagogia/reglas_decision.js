function evaluar({ message, profile, course_id }) {
  return {
    message,
    nivel_detectado: profile?.nivel || "desconocido",
    estrategia: "explicacion_progresiva",
  };
}

module.exports = {
  evaluar,
};
