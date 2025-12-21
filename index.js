const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "MagicBank Backend",
    environment: "production"
  });
});

app.post("/api/contact", (req, res) => {
  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      success: false,
      message: "Datos incompletos"
    });
  }

  console.log("📩 Nuevo contacto MagicBank:");
  console.log({ nombre, email, mensaje });

  res.json({
    success: true,
    message: "Mensaje recibido correctamente"
  });
});

app.listen(PORT, () => {
  console.log(`🟢 MagicBank Backend activo en puerto ${PORT}`);
});
