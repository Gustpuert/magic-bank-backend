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
    "PRUEBA DEL MÓDULO"
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
    throw new Error(`Archivo de progreso no encontrado para ${course_id}`);
  }

  const progreso = JSON.parse(fs.readFileSync(progresoPath, "utf-8"));

  let moduloActual = progreso.modulo_actual;
  const totalModulos = progreso.total_modulos;

  const salto = intentaSaltarModulo(message, moduloActual);

  /* =========================
     CONTEXTO INVISIBLE
  ========================= */

  let contexto = `
Curso: ${course_id}
Módulo actual: ${moduloActual} de ${totalModulos}

Si el alumno domina el módulo, puedes iniciar EXAMEN FORMAL.
Durante el examen:
- No des pistas
- No enseñes
- Evalúa con rigor
Declara explícitamente APROBADO o REPROBADO.
`;

  if (salto) {
    contexto += `
El alumno intenta saltar módulos.
Redirígelo con firmeza al módulo actual.
`;
  }

  /* =========================
     LLAMADA AL TUTOR
  ========================= */

  const response = await runTutor({
    course_id,
    message: `${contexto}\n\nMensaje del alumno: ${message}`,
    profile
  });

  const textoTutor = response.text || "";

  /* =========================
     DIAGNÓSTICO INICIAL
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

  if (aprobado) {
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
    aprobado
  };
}

module.exports = {
  runAula
};
