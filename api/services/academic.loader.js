const fs = require("fs");
const path = require("path");

/**
 * Rutas canónicas MagicBank
 */
const BASE_PATH = path.join(process.cwd(), "academic", "magicbank");

const ACADEMY_PATH = path.join(BASE_PATH, "academy", "cursos");
const UNIVERSITY_PATH = path.join(BASE_PATH, "university", "facultades");
const COUNCIL_PATH = path.join(BASE_PATH, "council");

/**
 * Lee un archivo JSON de forma segura
 */
function readJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * Carga un curso de MagicBank Academy
 */
function loadAcademyCourse(course_id) {
  const filePath = path.join(ACADEMY_PATH, `${course_id}.json`);
  return readJSON(filePath);
}

/**
 * Carga una facultad de MagicBank University
 */
function loadUniversityFaculty(faculty_id) {
  const filePath = path.join(UNIVERSITY_PATH, `${faculty_id}.json`);
  return readJSON(filePath);
}

/**
 * Carga MagicBank Council
 */
function loadCouncil() {
  const filePath = path.join(COUNCIL_PATH, "council.json");
  return readJSON(filePath);
}

/**
 * Resolver académico general
 */
function resolveAcademicEntity(course_id) {
  // 1️⃣ Intentar Academy
  const academyCourse = loadAcademyCourse(course_id);
  if (academyCourse) {
    return {
      tipo: "academy",
      data: academyCourse,
    };
  }

  // 2️⃣ Intentar University
  const universityFaculty = loadUniversityFaculty(course_id);
  if (universityFaculty) {
    return {
      tipo: "university",
      data: universityFaculty,
    };
  }

  // 3️⃣ Council
  if (course_id === "magicbank_council") {
    const council = loadCouncil();
    if (council) {
      return {
        tipo: "council",
        data: council,
      };
    }
  }

  // ❌ Nada encontrado
  return null;
}

module.exports = {
  resolveAcademicEntity,
};
