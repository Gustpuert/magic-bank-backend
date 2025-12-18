const express = require("express");
const router = express.Router();

/**
 * ================================
 * BASE DE DATOS SIMULADA – FASE 1
 * ================================
 * Luego se reemplaza por PostgreSQL
 */

// ESTUDIANTES
const students = [
  { id: "12345", status: "active" }
];

// MAGICBANK ACADEMY
const academyCourses = [
  {
    id: "cook-adv",
    name: "Cocina Avanzada",
    tutor: "Tutor Cocina Especializado"
  },
  {
    id: "nutri-smart",
    name: "Nutrición Inteligente",
    tutor: "Tutor Nutrición"
  },
  {
    id: "chatgpt-adv",
    name: "ChatGPT Avanzado",
    tutor: "Tutor IA Especializado"
  },
  {
    id: "english",
    name: "Inglés",
    tutor: "Supertraductor"
  },
  {
    id: "french",
    name: "Francés",
    tutor: "Supertraductor"
  },
  {
    id: "trading-cyclic",
    name: "Trading Cíclico",
    tutor: "Tutor Trading"
  },
  {
    id: "magic-pensions",
    name: "Pensiones Mágicas",
    tutor: "Tutor Pensiones"
  }
];

// MAGICBANK UNIVERSITY
const universityFaculties = [
  {
    faculty: "Administración y Negocios",
    tutor: "Superadministrador",
    modules: 10
  },
  {
    faculty: "Derecho",
    tutor: "Abogadus Tutor Pro",
    modules: 10
  },
  {
    faculty: "Contaduría",
    tutor: "Supercontador",
    modules: 10
  },
  {
    faculty: "Desarrollo de Software",
    tutor: "Superdesarrollador",
    modules: 10
  },
  {
    faculty: "Marketing",
    tutor: "Supermarketer",
    modules: 10
  }
];

// SUPERTUTORES
const superTutors = [
  {
    name: "Supertraductor",
    role: "Idiomas y acompañamiento de viajes"
  },
  {
    name: "BienestarTutor Pro",
    role: "Bienestar y acompañamiento del estudiante"
  }
];

/**
 * ================================
 * DASHBOARD REAL DEL ESTUDIANTE
 * ================================
 * GET /api/student/:id/dashboard
 */
router.get("/student/:id/dashboard", (req, res) => {
  const student = students.find(s => s.id === req.params.id);

  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  res.json({
    student_id: student.id,
    academy: academyCourses,
    university: universityFaculties,
    supertutors: superTutors,
    council: {
      name: "MagicBank Council",
      description: "Asesoría estratégica con todos los supertutores"
    }
  });
});

module.exports = router;
