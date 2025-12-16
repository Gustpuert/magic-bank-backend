api/students.js const express = require("express");
const router = express.Router();

/* ======================================================
   DATOS SIMULADOS (FASE LABORATORIO)
   Luego se migran a PostgreSQL
   ====================================================== */

const students = {
  "12345": {
    id: "12345",
    name: "Alumno Demo",
    status: "active",          // active | blocked | graduated
    currentModule: 1,
    progress: 100,             // % completado del módulo actual
    exams: {
      1: "passed"              // pending | passed | failed
    }
  }
};

const modules = [
  { id: 1, name: "Fundamentos", requiresExam: true },
  { id: 2, name: "POO", requiresExam: true },
  { id: 3, name: "Backend", requiresExam: true }
];

/* ======================================================
   REGLAS ACADÉMICAS (CEREBRO)
   ====================================================== */

function isStudentActive(student) {
  return student.status === "active";
}

function getAllowedModules(student) {
  return modules.filter(m => m.id <= student.currentModule);
}

function canTakeExam(student, moduleId) {
  const module = modules.find(m => m.id === moduleId);
  if (!module || !module.requiresExam) return false;
  if (student.progress < 100) return false;
  if (student.exams[moduleId] === "passed") return false;
  return true;
}

function canAdvanceModule(student) {
  const examStatus = student.exams[student.currentModule];
  return examStatus === "passed";
}

/* ======================================================
   ENDPOINTS GET (LECTURA)
   ====================================================== */

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
    exams: student.exams
  });
});

/* ======================================================
   🔥 ENDPOINT CLAVE — AVANCE DE MÓDULO
   ====================================================== */

// POST /api/student/:id/advance-module
router.post("/student/:id/advance-module", (req, res) => {
  const student = students[req.params.id];

  // 1️⃣ Validar estudiante
  if (!student) {
    return res.status(404).json({ error: "Estudiante no encontrado" });
  }

  // 2️⃣ Validar estado
  if (!isStudentActive(student)) {
    return res.status(403).json({ error: "Estudiante bloqueado" });
  }

  // 3️⃣ Verificar si puede avanzar
  if (!canAdvanceModule(student)) {
    return res.status(400).json({
      error: "No puede avanzar: examen no aprobado"
    });
  }

  // 4️⃣ Avanzar módulo
  const nextModule = student.currentModule + 1;

  // 5️⃣ Verificar si terminó el programa
  if (!modules.find(m => m.id === nextModule)) {
    student.status = "graduated";

    return res.json({
      message: "🎓 Programa finalizado. Felicitaciones.",
      status: student.status
    });
  }

  // 6️⃣ Actualizar estado académico
  student.currentModule = nextModule;
  student.progress = 0;
  student.exams[nextModule] = "pending";

  res.json({
    message: "✅ Módulo avanzado correctamente",
    currentModule: student.currentModule
  });
});

module.exports = router;
