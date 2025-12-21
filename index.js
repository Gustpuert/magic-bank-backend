/**
 * MAGICBANK — BACKEND CANÓNICO
 * Fase: Infraestructura + primer endpoint de negocio
 *
 * Stack:
 * - Node.js
 * - Express
 * - PostgreSQL (Railway)
 */

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

// ===============================
// INICIALIZACIÓN
// ===============================

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// MIDDLEWARES GLOBALES
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// CONEXIÓN POSTGRESQL (RAILWAY)
// ===============================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===============================
// ENDPOINT BASE — BACKEND ACTIVO
// ===============================

app.get("/", (req, res) => {
  res.json({
    status: "MagicBank Backend activo",
    service: "MagicBank University",
    environment: "production"
  });
});

// ===============================
// ENDPOINT CANÓNICO — HEALTH DB
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
// RUTAS DE NEGOCIO — CONTACTO
// ===============================

const contactRoutes = require("./api/contactRoutes");
app.use("/api", contactRoutes);

// ===============================
// INICIO DEL SERVIDOR
// ===============================

app.listen(PORT, () => {
  console.log(`MagicBank Backend corriendo en puerto ${PORT}`);
});
