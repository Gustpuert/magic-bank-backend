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
// { studentId: { faculty: { currentModule, approvedModules[], lastFailed } } }
const academicProgress = {};

const TOTAL_MODULES = 10;

function initProgress(studentId, faculty) {
  if (!academicProgress[studentId]) {
    academicProgress[studentId] = {};
  }
  if (!academicProgress[studentId][faculty]) {
    academicProgress[studentId][faculty] = {
      currentModule: 1,
      approvedModules: [],
      lastFailed: null
    };
  }
}

/**
 * ===================================
 * DASHBOARD POR FACULTAD
 * ===================================
 */
router.get("/student/:id/faculty/:faculty/dashboard", (req, res) => {
  const { id, faculty } = req.params;

  initProgress(id, faculty);
  const progress = academicProgress[id][faculty];

  const modules = [];

  for (let i = 1; i <= TOTAL_MODULES; i++) {
    let status = "locked";
    if (progress.approvedModules.includes(i)) status = "approved";
    else if (i === progress.currentModule) status = "active";

    modules.push({ module: i, status });
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
 * EXAMEN DE MÓDULO
 * ===================================
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
    progress.lastFailed = module;

    return res.json({
      result: "failed",
      tutorMode: true,
      message: "Tutor activado para refuerzo académico"
    });
  }

  progress.approvedModules.push(module);
  progress.currentModule++;
  progress.lastFailed = null;

  res.json({
    result: "passed",
    nextModule: progress.currentModule
  });
});

/**
 * ===================================
 * TUTOR ADAPTATIVO
 * ===================================
 * GET /api/student/:id/faculty/:faculty/tutor
 */
router.get("/student/:id/faculty/:faculty/tutor", (req, res) => {
  const { id, faculty } = req.params;

  initProgress(id, faculty);
  const progress = academicProgress[id][faculty];

  if (!progress.lastFailed) {
    return res.json({
      active: false,
      message: "No hay refuerzo activo"
    });
  }

  res.json({
    active: true,
    faculty,
    tutor: getTutorByFaculty(faculty),
    module: progress.lastFailed,
    strategy: "Refuerzo adaptativo",
    guidance: [
      "Repasar conceptos clave del módulo",
      "Explicación con lenguaje más simple",
      "Ejemplos prácticos adicionales",
      "Acompañamiento hasta comprensión total"
    ]
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
