/**
 * MAGICBANK — BACKEND CANÓNICO
 * Infraestructura + Contacto + CORS correcto
 */

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const contactRoutes = require("./api/contactRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// CORS CANÓNICO (FRONTEND ↔ BACKEND)
// ===============================

app.use(cors({
  origin: [
    "https://magicbank.org",
    "https://www.magicbank.org"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// Permitir preflight explícitamente
app.options("*", cors());

app.use(express.json());

// ===============================
// POSTGRESQL
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
    environment: "production"
  });
});

// ===============================
// HEALTH DB
// ===============================

app.get("/health/db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "OK", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

// ===============================
// RUTAS DE NEGOCIO
// ===============================

app.use("/api", contactRoutes);

// ===============================
// START
// ===============================

app.listen(PORT, () => {
  console.log(`MagicBank Backend corriendo en puerto ${PORT}`);
});
