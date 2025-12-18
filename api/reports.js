const express = require("express");
const router = express.Router();

/**
 * ===================================
 * REPORTES INSTITUCIONALES
 * ===================================
 * Usa datos agregados del historial académico
 */

// SIMULACIÓN DE HISTORIAL GLOBAL (fase 1)
// En producción se alimenta desde DB
const academicHistory = [
  { student_id: "12345", faculty: "Derecho", module: 1, result: "passed" },
  { student_id: "12345", faculty: "Derecho", module: 2, result: "failed" },
  { student_id: "67890", faculty: "Marketing", module: 1, result: "passed" },
  { student_id: "67890", faculty: "Marketing", module: 2, result: "passed" }
];

const certifications = [
  { student_id: "67890", faculty: "Marketing" }
];

/**
 * ===================================
 * REPORTE GENERAL
 * ===================================
 * GET /api/reports/overview
 */
router.get("/reports/overview", (req, res) => {
  const students = new Set(academicHistory.map(h => h.student_id));
  const faculties = {};

  academicHistory.forEach(h => {
    if (!faculties[h.faculty]) {
      faculties[h.faculty] = {
        attempts: 0,
        passed: 0,
        failed: 0
      };
    }

    faculties[h.faculty].attempts++;
    if (h.result === "passed") faculties[h.faculty].passed++;
    if (h.result === "failed") faculties[h.faculty].failed++;
  });

  res.json({
    total_students: students.size,
    faculties,
    certifications_issued: certifications.length
  });
});

module.exports = router;
