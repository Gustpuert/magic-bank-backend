const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// RUTA CORRECTA (nota el /aula/aula.routes)
const aulaRoutes = require("./api/magicbank/aula/aula.routes");

// Health check
app.get("/", (req, res) => {
  res.json({ status: "MagicBank Backend OK" });
});

// Aula API
app.use("/api/magicbank/aula", aulaRoutes);

// Puerto Railway
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
