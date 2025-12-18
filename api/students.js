const express = require("express");
const router = express.Router();

/**
 * ===================================
 * BASE DE DATOS SIMULADA – FASE 1
 * ===================================
 */

const students = [
  { id: "12345", name: "Estudiante MagicBank" }
];

const TOTAL_MODULES = 10;

// PROGRESO ACADÉMICO
const academicProgress = {};

// CERTIFICACIONES
// { code: { studentId, name, faculty, date } }
const certificates = {};

function initFaculty(studentId, faculty) {
  if (!academicProgress[studentId]) academicProgress[studentId] = {};
  if (!academicProgress[studentId][faculty]) {
    academicProgress[studentId][faculty] = {
      approvedModules: []
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
    return res.json({ result: "failed" });
  }

  if (!progress.approvedModules.includes(module)) {
    progress.approvedModules.push(module);
  }

  // ¿Completa la facultad?
  if (progress.approvedModules.length === TOTAL_MODULES) {
    const student = students.find(s => s.id === id);

    const code = `MBU-${id}-${faculty.replace(/\s+/g, "").toUpperCase()}`;

    certificates[code] = {
      code,
      studentId: id,
      name: student.name,
      faculty,
      date: new Date().toISOString().split("T")[0]
    };

    return res.json({
      result: "certified",
      certificateCode: code
    });
  }

  res.json({
    result: "passed",
    approvedModules: progress.approvedModules.length
  });
});

/**
 * ===================================
 * VALIDACIÓN PÚBLICA DE CERTIFICADO
 * ===================================
 * GET /api/certificate/:code
 */
router.get("/certificate/:code", (req, res) => {
  const cert = certificates[req.params.code];

  if (!cert) {
    return res.status(404).json({
      valid: false,
      message: "Certificado no encontrado"
    });
  }

  res.json({
    valid: true,
    certificate: cert
  });
});

module.exports = router;
