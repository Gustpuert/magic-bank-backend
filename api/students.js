const express = require("express");
const router = express.Router();

/**
 * ===================================
 * BASE DE DATOS SIMULADA – FASE 1
 * ===================================
 */

const students = [
  { id: "12345", status: "active", name: "Estudiante MagicBank" }
];

const TOTAL_MODULES = 10;

// PROGRESO ACADÉMICO
// { studentId: { faculty: { approvedModules[], certified } } }
const academicProgress = {};

// CERTIFICACIONES
// { studentId: [{ faculty, date }] }
const certifications = {};

function initFaculty(studentId, faculty) {
  if (!academicProgress[studentId]) academicProgress[studentId] = {};
  if (!academicProgress[studentId][faculty]) {
    academicProgress[studentId][faculty] = {
      approvedModules: [],
      certified: false
    };
  }
}

/**
 * ===================================
 * EXAMEN DE MÓDULO
 * ===================================
 */
router.post("/student/:id/faculty/:faculty/exam", (req, res) => {
  const { id, faculty } = req.params;
  const { module, passed } = req.body;

  initFaculty(id, faculty);
  const progress = academicProgress[id][faculty];

  if (!passed) {
    return res.json({
      result: "failed",
      message: "Tutor activado para refuerzo académico"
    });
  }

  if (!progress.approvedModules.includes(module)) {
    progress.approvedModules.push(module);
  }

  // ¿Completó la facultad?
  if (
    progress.approvedModules.length === TOTAL_MODULES &&
    !progress.certified
  ) {
    progress.certified = true;

    if (!certifications[id]) certifications[id] = [];
    certifications[id].push({
      faculty,
      date: new Date().toISOString().split("T")[0]
    });
  }

  res.json({
    result: "passed",
    approvedModules: progress.approvedModules.length,
    certified: progress.certified
  });
});

/**
 * ===================================
 * CERTIFICACIONES DEL ESTUDIANTE
 * ===================================
 * GET /api/student/:id/certifications
 */
router.get("/student/:id/certifications", (req, res) => {
  const { id } = req.params;

  res.json({
    student_id: id,
    certifications: certifications[id] || []
  });
});

module.exports = router;
