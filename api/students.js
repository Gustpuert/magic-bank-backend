const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

/**
 * Conexión a PostgreSQL
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * Health check del módulo students
 * URL final: /api/students/health
 */
router.get("/students/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "students module OK" });
  } catch (err) {
    console.error("Health check error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * Obtener todos los estudiantes
 * URL final: /api/students
 */
router.get("/students", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, student_code, full_name, email, status, created_at FROM students ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get students error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * Consultar estado de un alumno por código
 * URL final: /api/student/:code/status
 */
router.get("/student/:code/status", async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      "SELECT student_code, status FROM students WHERE student_code = $1",
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Status error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * ⚠️ Endpoint de inicialización (NO usar en producción)
 * URL: /api/__init_students_table__
 * Se deja comentado por seguridad
 */
/*
router.get("/__init_students_table__", async (req, res) => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        student_code VARCHAR(20) UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
    res.json({ message: "Tabla students creada correctamente" });
  } catch (err) {
    console.error("Init table error:", err);
    res.status(500).json({ error: "Database error" });
  }
});
*/

module.exports = router;
