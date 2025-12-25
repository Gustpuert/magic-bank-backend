const fs = require("fs");
const path = require("path");
const { runTutor } = require("../../services/tutor.service");

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

  const solicitado = parseInt(match[1], 10);
  return solicitado > moduloActual;
}

async function runAula({ message, course_id, profile }) {
  if (!message) {
    throw new Error("Mensaje vacío");
  }

  // 1. Cargar progreso
  const progresoPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "progreso",
    `${course_id}.json`
  );

  const progreso = JSON.parse(fs.readFileSync(progresoPath, "utf-8"));

  let moduloActual = progreso.modulo_actual;
  const totalModulos = progreso.total_modulos;

  // 2. Detectar intento de salto
  const salto = intentaSaltarModulo(message, moduloActual);

  // 3. Contexto invisible
  let contexto = `
Curso: ${course_id}
Módulo actual: ${moduloActual} de ${totalModulos}

Si es una interacción inicial, evalúa el nivel del alumno.
Si detectas que debe iniciar en otro módulo, indícalo explícitamente.
No avances sin aprobación.
`;

  if (salto) {
    contexto += `
El alumno intenta acceder a módulos posteriores.
Redirígelo con firmeza al módulo actual.
`;
  }

  // 4. Llamada al tutor
  const response = await runTutor({
    course_id,
    message: `${contexto}\n\nMensaje del alumno: ${message}`,
    profile
  });

  const textoTutor = response.text || "";

  // 5. Diagnóstico inicial (solo si aún está en módulo 1)
  if (moduloActual === 1) {
    const recomendado = detectarModuloRecomendado(textoTutor, totalModulos);

    if (recomendado && recomendado !== moduloActual) {
      progreso.modulo_actual = recomendado;
      moduloActual = recomendado;

      fs.writeFileSync(
        progresoPath,
        JSON.stringify(progreso, null, 2),
        "utf-8"
      );
    }
  }

  // 6. Evaluar aprobación
  const aprobado = tutorAprueba(textoTutor);

  if (aprobado && moduloActual < totalModulos) {
    progreso.modulos[moduloActual].aprobado = true;
    progreso.modulo_actual += 1;

    fs.writeFileSync(
      progresoPath,
      JSON.stringify(progreso, null, 2),
      "utf-8"
    );
  }

  return {
    text: textoTutor,
    modulo_actual: progreso.modulo_actual,
    aprobado,
    intento_salto: salto
  };
}

module.exports = {
  runAula
};
