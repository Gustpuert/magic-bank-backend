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

  const textoUpper = texto.toUpperCase();
  return señales.some(señal => textoUpper.includes(señal));
}

function intentaSaltarModulo(message, moduloActual) {
  const patrones = [
    /módulo\s*(\d+)/i,
    /modulo\s*(\d+)/i
  ];

  for (const patron of patrones) {
    const match = message.match(patron);
    if (match) {
      const moduloSolicitado = parseInt(match[1], 10);
      if (moduloSolicitado > moduloActual) {
        return true;
      }
    }
  }

  return false;
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

  const moduloActual = progreso.modulo_actual;
  const totalModulos = progreso.total_modulos;

  // 2. Detectar intento de salto
  const salto = intentaSaltarModulo(message, moduloActual);

  // 3. Contexto pedagógico invisible
  let contexto = `
Curso: ${course_id}
Módulo actual: ${moduloActual} de ${totalModulos}

Enseña exclusivamente el contenido del módulo actual.
Evalúa cuando lo consideres necesario.
No avances si el alumno no domina la técnica.
Declara explícitamente cuando el módulo esté APROBADO.
`;

  if (salto) {
    contexto += `
El alumno intenta acceder a contenido de módulos posteriores.
Redirígelo con firmeza y pedagogía al módulo actual.
No expliques contenidos futuros.
`;
  }

  // 4. Llamada al tutor
  const response = await runTutor({
    course_id,
    message: `${contexto}\n\nMensaje del alumno: ${message}`,
    profile
  });

  const textoTutor = response.text || "";

  // 5. Evaluar aprobación
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
