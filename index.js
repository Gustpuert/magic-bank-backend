/**
 * MAGICBANK — BACKEND CANÓNICO
 * Infraestructura base + primer endpoint de negocio
 */

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const contactRoutes = require("./api/contactRoutes");

// ===============================
// INICIALIZACIÓN
// ===============================

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// MIDDLEWARES
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// POSTGRESQL (RAILWAY)
// ===============================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===============================
// ENDPOINT BASE
// ===============================

app.get("/", (req, res) => {
  res.json({
    status: "MagicBank Backend activo",
    service: "MagicBank University",
    environment: "production"
  });
});

// ===============================
// HEALTH CHECK DB
// ===============================

app.get("/health/db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "OK",
      database: "PostgreSQL connected"
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: error.message
    });
  }
});

// ===============================
// RUTAS DE NEGOCIO
// ===============================

app.use("/api", contactRoutes);

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(`MagicBank Backend corriendo en puerto ${PORT}`);
});
