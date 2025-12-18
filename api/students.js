const express = require("express");
const router = express.Router();

/**
 * ===================================
 * BASE DE DATOS SIMULADA – FASE 1
 * ===================================
 */

// ESTUDIANTES
const students = [
  { id: "12345", status: "active" }
];

// PROGRESO ACADÉMICO
// { studentId: { faculty: { currentModule, approvedModules[] } } }
const academicProgress = {};

// TOTAL DE MÓDULOS POR FACULTAD
const TOTAL_MODULES = 10;

function initProgress(studentId, faculty) {
  if (!academicProgress[studentId]) {
    academicProgress[studentId] = {};
  }
  if (!academicProgress[studentId][faculty]) {
    academicProgress[studentId][faculty] = {
      currentModule: 1,
      approvedModules: []
    };
  }
}

/**
 * ===================================
 * DASHBOARD POR FACULTAD
 * ===================================
 * GET /api/student/:id/faculty/:faculty/dashboard
 */
router.get("/student/:id/faculty/:faculty/dashboard", (req, res) => {
  const { id, faculty } = req.params;

  const student = students.find(s => s.id === id);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  initProgress(id, faculty);
  const progress = academicProgress[id][faculty];

  const modules = [];

  for (let i = 1; i <= TOTAL_MODULES; i++) {
    let status = "locked";

    if (progress.approvedModules.includes(i)) {
      status = "approved";
    } else if (i === progress.currentModule) {
      status = "active";
    }

    modules.push({
      module: i,
      status
    });
  }

  res.json({
    student_id: id,
    faculty,
    tutor: getTutorByFaculty(faculty),
    modules
  });
});

/**
 * ===================================
 * PRESENTAR EXAMEN
 * ===================================
 * POST /api/student/:id/faculty/:faculty/exam
 */
router.post("/student/:id/faculty/:faculty/exam", (req, res) => {
  const { id, faculty } = req.params;
  const { module, passed } = req.body;

  initProgress(id, faculty);
  const progress = academicProgress[id][faculty];

  if (module !== progress.currentModule) {
    return res.status(403).json({ error: "Módulo no habilitado" });
  }

  if (!passed) {
    return res.json({
      result: "failed",
      action: "Tutor refuerza contenidos"
    });
  }

  progress.approvedModules.push(module);
  progress.currentModule++;

  res.json({
    result: "passed",
    nextModule: progress.currentModule
  });
});

/**
 * ===================================
 * TUTOR POR FACULTAD
 * ===================================
 */
function getTutorByFaculty(faculty) {
  const tutors = {
    "Administración y Negocios": "Superadministrador",
    "Derecho": "Abogadus Tutor Pro",
    "Contaduría": "Supercontador",
    "Desarrollo de Software": "Superdesarrollador",
    "Marketing": "Supermarketer"
  };

  return tutors[faculty] || "Tutor asignado";
}

module.exports = router;
