const fs = require("fs");
const path = require("path");
const { runTutor } = require("../tutors/tutor-connector");
const reglasDecision = require("../../pedagogia/reglas_decision");
const metricasBase = require("../../pedagogia/metricas_aprendizaje.json");

/**
 * Servicio central del Aula MagicBank
 * Aplica pedagogía constitucional antes de responder
 */
async function procesarAula({ student, course_id, message }) {
  // 1. Validaciones mínimas
  if (!course_id) {
    throw new Error("course_id es obligatorio");
  }

  if (!message) {
    throw new Error("Mensaje del alumno vacío");
  }

  // 2. Inicializar métricas del alumno (base + estado actual)
  const metricasAlumno = {
    ...metricasBase,
    errores_consecutivos: student?.errores_consecutivos || 0,
    nivel_actual: student?.nivel_actual || "medio",
    dominio_estimado: student?.dominio_estimado || 0.5,
    intentos: student?.intentos || 1
  };

  // 3. Ejecutar motor de reglas pedagógicas
  const decisionPedagogica = reglasDecision(metricasAlumno);

  /*
    decisionPedagogica ejemplo:
    {
      nivel_explicacion: "básico" | "intermedio" | "avanzado",
      estrategia: "retroceder" | "mantener" | "avanzar",
      tono: "simple" | "normal" | "tecnico"
    }
  */

  // 4. Construir perfil pedagógico para el tutor
  const perfilTutor = {
    preferred_name: student?.name || "Alumno",
    nivel_explicacion: decisionPedagogica.nivel_explicacion,
    estrategia: decisionPedagogica.estrategia,
    tono: decisionPedagogica.tono
  };

  // 5. Llamada al tutor gobernado
  const respuestaTutor = await runTutor({
    course_id,
    message,
    profile: perfilTutor
  });

  // 6. Retorno estandarizado para el controller
  return {
    ok: true,
    pedagogia: decisionPedagogica,
    respuesta: respuestaTutor.text
  };
}

module.exports = {
  procesarAula
};
