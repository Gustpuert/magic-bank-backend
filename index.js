/**
 * MagicBank Backend
 * Index principal - Railway Safe
 * NO cerrar procesos
 * NO puertos fijos
 * Manejo de errores correcto
 */

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

/* =========================
   CONFIGURACIÓN BÁSICA
========================= */

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   RUTAS PRINCIPALES
========================= */

// Health check (Railway lo usa)
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

// Aula MagicBank
app.use(
  "/api/magicbank/aula",
  require("./api/magicbank/aula.routes")
);

// (Opcional) otros módulos futuros
// app.use("/api/students", require("./api/students"));
// app.use("/api/reports", require("./api/reports"));

/* =========================
   MANEJO DE ERRORES GLOBAL
========================= */

app.use((err, req, res, next) => {
  console.error("🔥 Error global:", err);

  res.status(500).json({
    error: "Error interno del servidor",
    message: err.message || "Error desconocido",
  });
});

/* =========================
   SERVIDOR (OBLIGATORIO)
========================= */

// Railway asigna el puerto dinámicamente
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("🚀 MagicBank Backend corriendo en puerto", PORT);
});

/* =========================
   PROTECCIÓN ANTI-SIGTERM
========================= */

// Evita cierres silenciosos
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});
