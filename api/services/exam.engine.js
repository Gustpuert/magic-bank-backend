/**
 * Motor institucional de exámenes MagicBank University
 * Ejecuta el veredicto emitido por el tutor
 */

function evaluarExamen({ resultado, estadoAlumno }) {
  if (!resultado) {
    throw new Error("Resultado de examen no definido");
  }

  const estado = {
    ...estadoAlumno,
    aprobado: false,
    avanza: false,
    certificacion: false,
  };

  if (resultado === "APROBADO") {
    estado.aprobado = true;
    estado.avanza = true;
    estado.modulo_actual = estadoAlumno.modulo_actual + 1;

    if (estado.modulo_actual > 10) {
      estado.modulo_actual = 10;
      estado.certificacion = true;
    }
  }

  if (resultado === "NO_APROBADO") {
    estado.aprobado = false;
    estado.avanza = false;
    // se mantiene en el mismo módulo
  }

  return estado;
}

module.exports = {
  evaluarExamen,
};
