/**
 * MAGICBANK — BACKEND CANÓNICO
 * Plataforma educativa de alto valor con estándares supreme
 *
 * Stack:
 * - Node.js
 * - Express
 * - PostgreSQL (Railway)
 *
 * Archivo: index.js
 * Estado: Base estable de infraestructura
 * Nota: Sin rutas de negocio para evitar crashes
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
// CONEXIÓN A POSTGRESQL (RAILWAY)
// ===============================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ===============================
// ENDPOINT BASE — SALUD GENERAL
// ===============================

app.get("/", (req, res) => {
  res.json({
    status: "MagicBank Backend activo",
    service: "MagicBank University",
    environment: "production"
  });
});

// ===============================
// ENDPOINT CANÓNICO — SALUD BASE DE DATOS
// ===============================
// Diagnóstico interno:
// - No escribe datos
// - No crea tablas
// - Solo verifica conexión real

app.get("/health/db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "OK",
      database: "PostgreSQL connected",
      provider: "Railway"
    });
  } catch (error) {
    console.error("DB CONNECTION ERROR:", error);
    res.status(500).json({
      status: "ERROR",
      database: "PostgreSQL not connected",
      message: error.message
    });
  }
});

// ===============================
// INICIO DEL SERVIDOR
// ===============================

app.listen(PORT, () => {
  console.log(`MagicBank Backend corriendo en puerto ${PORT}`);
});
