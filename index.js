/**
 * MAGICBANK — BACKEND CANÓNICO
 * Plataforma educativa de alto valor con estándares supreme
 * Backend Node.js + Express + PostgreSQL (Railway)
 *
 * Archivo: index.js
 * Estado: Producción controlada
 */

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

// ===============================
// CONFIGURACIÓN BASE
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
// ENDPOINT DE SALUD GENERAL
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
// ⚠️ Endpoint diagnóstico interno
// ⚠️ No modifica datos
// ⚠️ No crea tablas
// ⚠️ Solo verifica conectividad real

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
// RUTAS DE NEGOCIO (API)
// ===============================

const studentRoutes = require("./api/studentRoutes");
app.use("/api", studentRoutes);

// ===============================
// INICIO DEL SERVIDOR
// ===============================

app.listen(PORT, () => {
  console.log(`MagicBank Backend corriendo en puerto ${PORT}`);
});
