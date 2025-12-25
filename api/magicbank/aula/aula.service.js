const fs = require("fs");
const path = require("path");
const { runTutor } = require("../../services/tutor.service");

async function runAula({ message, course_id, profile }) {
  if (!message) {
    throw new Error("Mensaje vacío");
  }

  // 1. Cargar progreso del alumno
  const progresoPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "progreso",
    `${course_id}.json`
  );

  const progreso = JSON.parse(fs.readFileSync(progresoPath, "utf-8"));

  const modulo = progreso.modulo_actual;
  const total = progreso.total_modulos;

  // 2. Contexto pedagógico invisible para el alumno
  const contexto = `
Curso: ${course_id}
Módulo actual: ${modulo} de ${total}

Enseña exclusivamente el contenido correspondiente a este módulo.
No avances al siguiente módulo sin evaluación y aprobación explícita.
Si el alumno no domina la técnica, refuerza antes de avanzar.
Mantén rigor técnico y pedagogía progresiva.
`;

  // 3. Llamada al tutor real (ElChef)
  const response = await runTutor({
    course_id,
    message: `${contexto}\n\nMensaje del alumno: ${message}`,
    profile
  });

  return {
    text: response.text,
    modulo_actual: modulo,
    total_modulos: total
  };
}

module.exports = {
  runAula
};
