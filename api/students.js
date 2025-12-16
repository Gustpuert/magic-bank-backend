const express = require("express");
const router = express.Router();

/**
 * BASE DE DATOS SIMULADA (FASE 1)
 * En fases posteriores se reemplaza por PostgreSQL
 */

const students = [
  { id: "12345", status: "active" },
  { id: "67890", status: "inactive" }
];

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
 * 2️⃣ PROGRESO POR MÓDULOS
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
 * 3️⃣ ACCESO A SUPERTUTOR IA
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

module.exports = router;
