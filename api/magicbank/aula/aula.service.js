const path = require("path");
const { runTutor } = require("../../services/tutor.service");

/**
 * Servicio central del Aula MagicBank
 * Orquesta el tutor según curso, alumno y mensaje
 */
async function procesarMensajeAula({ course_id, message, student }) {
  if (!course_id) {
    throw new Error("course_id es obligatorio");
  }

  if (!message) {
    throw new Error("message es obligatorio");
  }

  // Perfil mínimo del estudiante
  const profile = {
    preferred_name: student?.name || "Alumno",
    level: student?.level || "desconocido"
  };

  // Llamada al tutor inteligente
  const tutorResponse = await runTutor({
    course_id,
    message,
    profile
  });

  return {
    success: true,
    course_id,
    response: tutorResponse.text
  };
}

module.exports = {
  procesarMensajeAula
};
