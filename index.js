const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   Middlewares
========================= */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* =========================
   Rutas básicas (OBLIGATORIAS)
========================= */

// Ruta raíz (para verificar que el backend responde)
app.get("/", (req, res) => {
  res.json({
    status: "MagicBank Backend activo",
    service: "MagicBank University",
    environment: "production"
  });
});

// Ruta de prueba
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Ruta que usará el frontend (formulario contacto)
app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: "Datos incompletos"
    });
  }

  // Por ahora SOLO confirmamos recepción
  return res.json({
    success: true,
    message: "Mensaje recibido correctamente"
  });
});

/* =========================
   Inicio del servidor
========================= */
app.listen(PORT, () => {
  console.log(`MagicBank Backend corriendo en puerto ${PORT}`);
});
