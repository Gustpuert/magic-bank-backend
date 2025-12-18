const express = require("express");
const router = express.Router();
const pool = require("../db");

/**
 * GET - Estado del alumno
 */
router.get("/student/:id/status", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT status FROM students WHERE student_code = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({
      student_id: id,
      status: result.rows[0].status
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * POST - Crear alumno
 */
router.post("/student", async (req, res) => {
  try {
    const {
      student_code,
      full_name,
      email,
      education_type
    } = req.body;

    // Validaciones mínimas
    if (!student_code || !full_name || !email || !education_type) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    if (!["academy", "university"].includes(education_type)) {
      return res.status(400).json({
        error: "Invalid education_type"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO students (
        student_code,
        full_name,
        email,
        status,
        education_type
      ) VALUES ($1, $2, $3, 'active', $4)
      ON CONFLICT (student_code) DO NOTHING
      RETURNING student_code, full_name, email, status, education_type
      `,
      [student_code, full_name, email, education_type]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        error: "Student already exists"
      });
    }

    res.status(201).json({
      message: "Student created",
      student: result.rows[0]
    });

  } catch (error) {
    console.error("Create student error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
