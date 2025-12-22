const express = require("express");
const cors = require("cors");

const studentRoutes = require("./api/students");

// MAGICBANK
const magicbankAulaRoutes = require("./api/magicbank/aula/aula.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta base
app.get("/", (req, res) => {
  res.json({ status: "Magic Bank Backend activo" });
});

// Rutas existentes
app.use("/api", studentRoutes);

// MAGICBANK AULA
app.use("/api/magicbank/aula", magicbankAulaRoutes);

// Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
