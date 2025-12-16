api/students.js const express = require("express");
const router = express.Router();

/* ======================================================
   1️⃣ DATOS SIMULADOS (MEMORIA)
   ====================================================== */

const students = {
  "12345": {
    id: "12345",
    name: "Alumno Demo",
    status: "active", // active | blocked | graduated
    currentModule: 1,
    progress: 80,
    exams: {
      1: "pending" // pending | passed | failed
    }
  }
};

const modules = [
  { id: 1, name: "Fundamentos", requiresExam: true },
  { id: 2, name: "POO", requiresExam: true },
  { id: 3, name: "Backend", requiresExam: true }
];

/* ======================================================
   2️⃣ FUNCIONES ACADÉMICAS (EL CEREBRO)
   ====================================================== */

// ¿El estudiante puede estudiar?
function isStudentActive(student) {
  return student.status === "active";
}

// ¿Qué módulos puede ver?
function getAllowedModules(student) {
  return modules.filter(
    module => module.id <= student.currentModule
  );
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
  const module = modules.find(m => m.id === student.currentModule);

  if (examStatus === "passed") return true;
  if (module && !module.requiresExam) return true;

  return false;
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
   3️⃣ ENDPOINTS ACADÉMICOS
   ====================================================== */

// Estado básico del estudiante
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

// Módulos permitidos
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

// Acceso del tutor IA
router.get("/student/:id/tutor-access", (req, res) => {
  const student = students[req.params.id];

  if (!student) {
    return res.status(404).json({ error: "Estudiante no encontrado" });
  }

  res.json(getTutorAccess(student));
});

// 🔥 ESTADO ACADÉMICO COMPLETO (ENDPOINT CLAVE)
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
