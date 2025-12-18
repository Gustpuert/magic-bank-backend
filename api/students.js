const express = require("express");
const router = express.Router();
const pool = require("../db");

/**
 * ENDPOINT REAL Y DEFINITIVO
 * Devuelve el estado del alumno desde PostgreSQL
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

module.exports = router;
