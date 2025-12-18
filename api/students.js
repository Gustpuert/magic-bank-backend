const express = require("express");
const router = express.Router();
const pool = require("../db");

/**
 * ENDPOINT REAL
 * Consulta el estado del alumno desde PostgreSQL
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
    console.error("DB error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * ENDPOINT TEMPORAL (SOLO INICIALIZACIÓN)
 * Crea extensión UUID y tabla students
 * SE EJECUTA UNA SOLA VEZ Y LUEGO SE BORRA
 */
router.get("/__init_db__", async (req, res) => {
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_code VARCHAR(20) UNIQUE NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive')),
        education_type VARCHAR(20) NOT NULL CHECK (education_type IN ('academy', 'university')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    res.json({
      ok: true,
      message: "Extensión y tabla students creadas correctamente"
    });
  } catch (error) {
    console.error("Init DB error:", error);
    res.status(500).json({ error: "DB init error" });
  }
});

module.exports = router;
