const fs = require("fs");
const path = require("path");
const { runTutor } = require("../../services/tutor.service");

/* =========================
   DETECTORES DEL TUTOR
========================= */

function tutorAprueba(texto) {
  if (!texto) return false;

  const señales = [
    "APROBADO",
    "MÓDULO APROBADO",
    "PUEDES AVANZAR",
    "MÓDULO SUPERADO",
    "HAS SUPERADO EL MÓDULO"
  ];

  return señales.some(s => texto.toUpperCase().includes(s));
}

function tutorIniciaExamen(texto) {
  if (!texto) return false;

  const señales = [
    "EXAMEN",
    "EVALUACIÓN FORMAL",
    "PRUEBA DEL MÓDULO",
    "INICIAR EXAMEN"
  ];

  return señales.some(s => texto.toUpperCase().includes(s));
}

function detectarModuloRecomendado(texto, totalModulos) {
  if (!texto) return null;

  const match = texto.match(/módulo\s*(\d+)/i);
  if (!match) return null;

  const modulo = parseInt(match[1], 10);
  if (modulo >= 1 && modulo <= totalModulos) {
    return modulo;
  }

  return null;
}

function intentaSaltarModulo(message, moduloActual) {
  const match = message.match(/módulo\s*(\d+)/i);
  if (!match) return false;

  return parseInt(match[1], 10) > moduloActual;
}

/* =========================
   AULA PRINCIPAL
========================= */

async function runAula({ message, course_id, profile }) {
  if (!message) {
    throw new Error("Mensaje vacío");
  }

  const progresoPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "progreso",
    `${course_id}.json`
  );

  if (!fs.existsSync(progresoPath)) {
    throw new Error(`Progreso no encontrado para el curso ${course_id}`);
  }

  const progreso = JSON.parse(fs.readFileSync(progresoPath, "utf-8"));

  let moduloActual = progreso.modulo_actual;
  const totalModulos = progreso.total_modulos;

  const salto = intentaSaltarModulo(message, moduloActual);

  /* =========================
     DETERMINACIÓN DE MODO
     (CLASE vs EXAMEN)
  ========================= */

  let modo = "clase";

  if (tutorIniciaExamen(message)) {
    modo = "examen";
  }

  /* =========================
     CONTEXTO INVISIBLE
  ========================= */

  let contexto = `
INSTITUCIÓN: MagicBank Academy
CURSO: ${course_id}
MÓDULO ACTUAL: ${moduloActual} de ${totalModulos}
MODO ACTUAL: ${modo}

REGLAS ESTRICTAS:
- Si MODO = clase:
  • Enseña el módulo actual paso a paso.
  • Explica conceptos, técnica y fundamentos.
  • No evalúes todavía.
- Si MODO = examen:
  • NO enseñes.
  • NO des pistas.
  • Evalúa con rigor profesional.
  • Declara explícitamente APROBADO o REPROBADO.
- Nunca permitas saltar módulos.
- Mantente siempre dentro del módulo actual.
`;

  if (salto) {
    contexto += `
ALERTA:
El alumno intenta saltar módulos.
Debes redirigirlo con firmeza al módulo ${moduloActual}.
`;
  }

  /* =========================
     LLAMADA AL TUTOR
  ========================= */

  const response = await runTutor({
    course_id,
    message: `${contexto}\n\nMENSAJE DEL ALUMNO:\n${message}`,
    profile
  });

  const textoTutor = response.text || response.response || "";

  /* =========================
     AJUSTE INICIAL DE MÓDULO
     (SOLO SI ES EL PRIMERO)
  ========================= */

  if (moduloActual === 1) {
    const recomendado = detectarModuloRecomendado(textoTutor, totalModulos);
    if (recomendado && recomendado !== moduloActual) {
      progreso.modulo_actual = recomendado;
      moduloActual = recomendado;
    }
  }

  /* =========================
     EXAMEN, AVANCE Y CIERRE
  ========================= */

  const aprobado = tutorAprueba(textoTutor);
  let certificado = false;

  if (modo === "examen" && aprobado) {
    progreso.modulos[moduloActual].aprobado = true;

    if (moduloActual < totalModulos) {
      progreso.modulo_actual += 1;
    } else {
      progreso.estado = "CERTIFICADO";
      progreso.fecha_certificacion = new Date().toISOString();
      certificado = true;
    }
  }

  fs.writeFileSync(
    progresoPath,
    JSON.stringify(progreso, null, 2),
    "utf-8"
  );

  /* =========================
     RESPUESTA FINAL
  ========================= */

  if (certificado) {
    return {
      text:
        textoTutor +
        "\n\n🎓 FELICITACIONES: Has completado y aprobado el curso completo. MagicBank certifica tu formación.",
      estado: "CERTIFICADO",
      curso: course_id
    };
  }

  return {
    text: textoTutor,
    modulo_actual: progreso.modulo_actual,
    modo,
    aprobado
  };
}

module.exports = {
  runAula
};
