/**
 * Reglas pedagógicas centrales de MagicBank
 * Controla tono, avance, módulos y decisiones del tutor
 */

function evaluar({ message, profile = {}, course_id }) {
  if (!course_id) {
    throw new Error("course_id es obligatorio para reglas_decision");
  }

  const nivel = profile?.nivel_actual || 1;
  const modulo = profile?.modulo_actual || 1;
  const tipoInstitucion = detectarInstitucion(course_id);

  let mensajeTutor = message;
  let decision = {
    institucion: tipoInstitucion,
    curso: course_id,
    modulo_actual: modulo,
    nivel_actual: nivel,
    permite_avanzar: true,
    requiere_examen: false,
    certificacion: false,
  };

  // 🏫 MAGICBANK UNIVERSITY (por módulos obligatorios)
  if (tipoInstitucion === "university") {
    decision.requiere_examen = true;

    mensajeTutor = `
Estamos en el módulo ${modulo} de 10.
No se puede avanzar sin aprobar el examen correspondiente.
Pregunta del estudiante: ${message}
    `.trim();

    if (modulo >= 10) {
      decision.certificacion = true;
      mensajeTutor = `
Has llegado al último módulo.
El tutor evaluará si estás listo para certificación.
Consulta: ${message}
      `.trim();
    }
  }

  // 🎓 MAGICBANK ACADEMY (aprendizaje guiado)
  if (tipoInstitucion === "academy") {
    mensajeTutor = `
Curso práctico de MagicBank Academy.
Nivel actual: ${nivel}.
Consulta del estudiante: ${message}
    `.trim();
  }

  // 🧙 MAGICBANK COUNCIL (consejo de sabios)
  if (tipoInstitucion === "council") {
    mensajeTutor = `
Consulta elevada al MagicBank Council.
Se responderá con visión estratégica y multidisciplinaria.
Tema: ${message}
    `.trim();
  }

  return {
    message: mensajeTutor,
    decision,
  };
}

/**
 * Detecta si el course_id pertenece a academy, university o council
 */
function detectarInstitucion(course_id) {
  if (course_id.includes("facultad") || course_id.includes("university")) {
    return "university";
  }

  if (
    course_id.includes("cocina") ||
    course_id.includes("nutricion") ||
    course_id.includes("idioma") ||
    course_id.includes("trading") ||
    course_id.includes("pension") ||
    course_id.includes("artes")
  ) {
    return "academy";
  }

  if (course_id.includes("council")) {
    return "council";
  }

  // fallback seguro
  return "academy";
}

module.exports = {
  evaluar,
};
