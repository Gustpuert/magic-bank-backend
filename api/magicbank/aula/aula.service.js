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

  // 2. Contexto pedagógico invisible
  const contexto = `
Curso: ${course_id}
Módulo actual: ${moduloActual} de ${totalModulos}

Enseña únicamente el contenido del módulo actual.
Evalúa cuando lo consideres necesario.
No avances si el alumno no domina la técnica.
Declara explícitamente cuando el módulo esté APROBADO.
`;

  // 3. Llamada al tutor (ElChef)
  const response = await runTutor({
    course_id,
    message: `${contexto}\n\nMensaje del alumno: ${message}`,
    profile
  });

  const textoTutor = response.text || "";

  // 4. ¿El tutor aprobó?
  const aprobado = tutorAprueba(textoTutor);

  // 5. Avanzar módulo si corresponde
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
    aprobado
  };
}

module.exports = {
  runAula
};
