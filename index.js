index.jsconst express = require("express");
const cors = require("cors");
require("dotenv").config();

// 🔹 IMPORTANTE: conectar las rutas de estudiantes
const studentRoutes = require("./api/students");

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());

// Ruta raíz (para verificar que el backend está activo)
app.get("/", (req, res) => {
  res.json({ status: "Magic Bank Backend activo" });
});

// 🔹 AQUÍ SE ACTIVAN TODAS LAS RUTAS /api
app.use("/api", studentRoutes);

// Puerto dinámico (Railway)
const PORT = process.env.PORT || 3000;

// Arranque del servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
