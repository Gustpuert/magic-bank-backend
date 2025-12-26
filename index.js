/**
 * MagicBank Backend - index.js
 * Archivo raíz
 */

const express = require("express");
const cors = require("cors");

const aulaRouter = require("./api/magicbank/aula/aula.controller");

const app = express();
const PORT = process.env.PORT || 8080;

/* =========================
   MIDDLEWARE GLOBAL
========================= */

app.use(cors());
app.use(express.json({ limit: "2mb" }));

/* =========================
   HEALTHCHECK (OBLIGATORIO)
========================= */

app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/* =========================
   RUTAS
========================= */

app.use("/api/aula", aulaRouter);

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`✅ MagicBank Backend corriendo en puerto ${PORT}`);
});

/* =========================
   MANEJO DE SEÑALES
========================= */

process.on("SIGTERM", () => {
  console.warn("⚠️ SIGTERM recibido. Cerrando servidor...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.warn("⚠️ SIGINT recibido. Cerrando servidor...");
  process.exit(0);
});
