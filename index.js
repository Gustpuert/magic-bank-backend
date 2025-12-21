/**
 * MagicBank Backend – Contacto
 * Servicio oficial MagicBank University
 * Producción – Railway
 */

const express = require("express");
const cors = require("cors");

const app = express();

// ==========================
// CONFIGURACIÓN BÁSICA
// ==========================
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ==========================
// RUTA DE ESTADO (SALUD)
// ==========================
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "MagicBank Backend",
    environment: "production",
    message: "MagicBank Backend activo y operativo"
  });
});

// ==========================
// RUTA CONTACTO
// ==========================
app.post("/api/contact", (req, res) => {
  const { nombre, email, mensaje } = req.body;

  // Validación mínima
  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      status: "error",
      message: "Faltan campos obligatorios"
    });
  }

  // LOG CANÓNICO (Railway)
  console.log("📩 Nuevo mensaje de contacto:");
  console.log("Nombre:", nombre);
  console.log("Email:", email);
  console.log("Mensaje:", mensaje);
  console.log("-----------------------------");

  // Respuesta al frontend
  res.status(200).json({
    status: "success",
    message: "Mensaje recibido correctamente"
  });
});

// ==========================
// SERVIDOR
// ==========================
app.listen(PORT, () => {
  console.log("🟢 MagicBank Backend iniciado");
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
