const express = require("express");
const router = express.Router();

/**
 * BASE DE DATOS SIMULADA (FASE 1)
 * En fase PostgreSQL se reemplaza sin cambiar la API
 */

// Estudiantes
const students = [
  { id: "12345", status: "active" },
  { id: "67890", status: "inactive" }
];

// Módulos por estudiante (simulado)
const studentModules = {
  "12345": [
    {
      module_id: "eco-101",
      name: "Introducción a Economía Social",
      state: "completed"
    },
    {
      module_id: "coop-201",
      name: "Cooperativismo Avanzado",
      state: "in_progress"
    }
  ]
};

// Progreso por estudiante y módulo
// { studentId: { moduleCode: lessonId } }
const studentProgress = {};

/**
 * 1️⃣ ESTADO DEL ESTUDIANTE
 * GET /api/student/:id/status
 */
router.get("/student/:id/status", (req, res) => {
  const student = students.find(s => s.id === req.params.id);

  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  res.json({
    student_id: student.id,
    status: student.status
  });
});

/**
 * 2️⃣ MÓDULOS DEL ESTUDIANTE
 * GET /api/student/:id/modules
 */
router.get("/student/:id/modules", (req, res) => {
  const modules = studentModules[req.params.id];

  if (!modules) {
    return res.status(404).json({
      student_id: req.params.id,
      modules: []
    });
  }

  res.json({
    student_id: req.params.id,
    modules
  });
});

/**
 * 3️⃣ ACCESO AL TUTOR IA
 * GET /api/student/:id/tutor-access
 */
router.get("/student/:id/tutor-access", (req, res) => {
  const student = students.find(s => s.id === req.params.id);

  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  res.json({
    student_id: student.id,
    enabled: student.status === "active"
  });
});

/**
 * 4️⃣ GUARDAR PROGRESO DE LECCIÓN
 * POST /api/student/:id/progress
 */
router.post("/student/:id/progress", (req, res) => {
  const { id } = req.params;
  const { module, lesson_id } = req.body;

  if (!module || !lesson_id) {
    return res.status(400).json({ error: "Missing data" });
  }

  if (!studentProgress[id]) {
    studentProgress[id] = {};
  }

  studentProgress[id][module] = lesson_id;

  res.json({
    student_id: id,
    module,
    lesson_id,
    status: "saved"
  });
});

/**
 * 5️⃣ RECUPERAR ÚLTIMA LECCIÓN DEL MÓDULO
 * GET /api/student/:id/progress/:module
 */
router.get("/student/:id/progress/:module", (req, res) => {
  const { id, module } = req.params;

  const lesson_id =
    studentProgress[id] && studentProgress[id][module]
      ? studentProgress[id][module]
      : null;

  res.json({
    student_id: id,
    module,
    lesson_id
  });
});

module.exports = router;
