/**
 * MagicBank Backend
 * Entry point oficial
 * Compatible con Railway
 * Canon estable
 */

const express = require("express");
const cors = require("cors");

/* =========================
   IMPORTACIÓN DE RUTAS
========================= */
const aulaRoutes = require("./api/magicbank/aula/aula.routes");
const loginRoutes = require("./api/auth/login.routes");

/* =========================
   APP
========================= */
const app = express();

/* =========================
   MIDDLEWARES GLOBALES
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK
   (Railway / monitoreo)
========================= */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/* =========================
   RUTAS PRINCIPALES
========================= */

// Aula MagicBank (clases, exámenes, progreso)
app.use("/api/magicbank/aula", aulaRoutes);

// Login y control de acceso
app.use("/api/auth", loginRoutes);

/* =========================
   404 CONTROLADO
========================= */
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada en MagicBank Backend"
  });
});

/* =========================
   SERVER START
   Railway exige process.env.PORT
========================= */
const PORT = process.env.PORT;

if (!PORT) {
  console.error("❌ PORT no definido por el entorno");
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ MagicBank Backend corriendo en puerto ${PORT}`);
});
