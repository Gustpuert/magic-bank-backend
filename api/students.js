api/students.js const express = require("express");
const router = express.Router();

/* ======================================================
   DATOS SIMULADOS (LABORATORIO ACADÉMICO – FASE 1)
   Luego se reemplazan por PostgreSQL
   ====================================================== */

const students = {
  "12345": {
    id: "12345",
    name: "Alumno Demo",
    status: "active",        // active | blocked | graduated
    currentModule: 1,
    progress: 80,            // porcentaje 0–100
    exams: {
      1: "pending"          // pending | passed | failed
    }
  }
};

const modules = [
  { id: 1, name: "Fundamentos", requiresExam: true },
  { id: 2, name: "POO", requiresExam: true },
  { id: 3, name: "Backend", requiresExam: true }
];

/* ======================================================
   REGLAS ACADÉMICAS (CEREBRO DEL SISTEMA)
   ====================================================== */

// ¿El estudiante está habilitado?
function isStudentActive(student) {
  return student.status === "active";
}

// ¿Qué módulos puede ver?
function getAllowedModules(student) {
  return modules.filter(m => m.id <= student.currentModule);
}

// ¿Puede rendir examen?
function canTakeExam(student, moduleId) {
  const module = modules.find(m => m.id === moduleId);
  if (!module || !module.requiresExam) return false;
  if (student.progress < 100) return false;
  if (student.exams[moduleId] === "passed") return false;
  return true;
}

// ¿Puede avanzar de módulo?
function canAdvanceModule(student) {
  const examStatus = student.exams[student.currentModule];
  return examStatus === "passed";
}

// ¿Qué puede hacer el tutor IA?
function getTutorAccess(student) {
  if (!isStudentActive(student)) {
    return {
      canViewContent: false,
      canTakeExam: false,
      canAdvance: false
    };
  }

  return {
    canViewContent: true,
    canTakeExam: canTakeExam(student, student.currentModule),
    canAdvance: canAdvanceModule(student)
  };
}

/* ======================================================
   ENDPOINTS ACADÉMICOS
   ====================================================== */

// 1️⃣ Estado del estudiante
// GET /api/student/:id/status
router.get("/student/:id/status", (req, res) => {
  const student = students[req.params.id];

  if (!student) {
    return res.status(404).json({ error: "Estudiante no encontrado" });
  }

  res.json({
    student_id: student.id,
    status: student.status
  });
});

// 2️⃣ Módulos permitidos
// GET /api/student/:id/modules
router.get("/student/:id/modules", (req, res) => {
  const student = students[req.params.id];

  if (!student) {
    return res.status(404).json({ error: "Estudiante no encontrado" });
  }

  res.json({
    currentModule: student.currentModule,
    allowedModules: getAllowedModules(student)
  });
});

// 3️⃣ Acceso del tutor IA
// GET /api/student/:id/tutor-access
router.get("/student/:id/tutor-access", (req, res) => {
  const student = students[req.params.id];

  if (!student) {
    return res.status(404).json({ error: "Estudiante no encontrado" });
  }

  res.json(getTutorAccess(student));
});

// 4️⃣ Estado académico completo (ENDPOINT CLAVE)
// GET /api/student/:id/academic-status
router.get("/student/:id/academic-status", (req, res) => {
  const student = students[req.params.id];

  if (!student) {
    return res.status(404).json({ error: "Estudiante no encontrado" });
  }

  res.json({
    studentId: student.id,
    status: student.status,
    currentModule: student.currentModule,
    progress: student.progress,
    allowedModules: getAllowedModules(student),
    tutorAccess: getTutorAccess(student)
  });
});

module.exports = router;
