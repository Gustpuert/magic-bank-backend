/**
 * Persistencia simple del progreso académico del estudiante
 * (almacenamiento en memoria / archivo – etapa inicial)
 */

const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_PATH, "students_progress.json");

// Asegurar carpeta data
if (!fs.existsSync(DATA_PATH)) {
  fs.mkdirSync(DATA_PATH);
}

// Inicializar archivo si no existe
if (!fs.existsSync(FILE_PATH)) {
  fs.writeFileSync(FILE_PATH, JSON.stringify({}, null, 2));
}

/**
 * Leer estado completo
 */
function readAll() {
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
}

/**
 * Guardar estado completo
 */
function writeAll(data) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

/**
 * Obtener progreso de un estudiante
 */
function getStudentProgress(studentId, course_id) {
  const data = readAll();

  if (!data[studentId]) {
    data[studentId] = {};
  }

  if (!data[studentId][course_id]) {
    data[studentId][course_id] = {
      modulo_actual: 1,
      aprobados: [],
      certificado: false,
    };
  }

  writeAll(data);
  return data[studentId][course_id];
}

/**
 * Actualizar progreso del estudiante
 */
function updateStudentProgress(studentId, course_id, newState) {
  const data = readAll();

  if (!data[studentId]) {
    data[studentId] = {};
  }

  data[studentId][course_id] = {
    ...data[studentId][course_id],
    ...newState,
  };

  writeAll(data);
  return data[studentId][course_id];
}

module.exports = {
  getStudentProgress,
  updateStudentProgress,
};
