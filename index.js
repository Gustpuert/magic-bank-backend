/**
 * MagicBank Backend
 * Entry point
 */

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./api/auth/auth.routes");
const accessRoutes = require("./api/access/access.routes");

const app = express();

/* =========================
   MIDDLEWARE GLOBAL
========================= */

app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "MagicBank Backend",
    status: "running"
  });
});

/* =========================
   ROUTES
========================= */

// Autenticación (login / register)
app.use("/api/auth", authRoutes);

// Control de accesos (academy / university / cursos)
app.use("/api/access", accessRoutes);

/* =========================
   ERROR HANDLER BÁSICO
========================= */

app.use((err, req, res, next) => {
  console.error("Error global:", err);
  res.status(500).json({
    ok: false,
    message: "Error interno del servidor"
  });
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT;

if (!PORT) {
  console.error("❌ PORT no definido en variables de entorno");
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ MagicBank Backend corriendo en puerto ${PORT}`);
});
