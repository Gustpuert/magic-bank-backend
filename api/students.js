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

// PROGRESO POR FACULTAD Y MÓDULO
// { studentId: { faculty: { currentModule, approvedModules[] } } }
const academicProgress = {};

/**
 * INICIALIZAR PROGRESO SI NO EXISTE
 */
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
 * OBTENER ESTADO ACADÉMICO
 * ===================================
 * GET /api/student/:id/faculty/:faculty/status
 */
router.get("/student/:id/faculty/:faculty/status", (req, res) => {
  const { id, faculty } = req.params;

  const student = students.find(s => s.id === id);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  initProgress(id, faculty);

  res.json({
    student_id: id,
    faculty,
    ...academicProgress[id][faculty]
  });
});

/**
 * ===================================
 * PRESENTAR EXAMEN DE MÓDULO
 * ===================================
 * POST /api/student/:id/faculty/:faculty/exam
 * Body: { module, passed }
 */
router.post("/student/:id/faculty/:faculty/exam", (req, res) => {
  const { id, faculty } = req.params;
  const { module, passed } = req.body;

  initProgress(id, faculty);

  const progress = academicProgress[id][faculty];

  if (module !== progress.currentModule) {
    return res.status(403).json({
      error: "No puede presentar este módulo aún"
    });
  }

  if (!passed) {
    return res.json({
      student_id: id,
      faculty,
      module,
      result: "failed",
      action: "Tutor refuerza contenidos y retrocede"
    });
  }

  // Aprueba
  progress.approvedModules.push(module);
  progress.currentModule++;

  res.json({
    student_id: id,
    faculty,
    module,
    result: "passed",
    nextModule: progress.currentModule
  });
});

module.exports = router;
