const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// 🔑 RUTA DE VIDA (CRÍTICA PARA RAILWAY)
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

// Rutas reales de la app
const aulaRoutes = require("./api/magicbank/aula/aula.routes");
app.use("/api/magicbank/aula", aulaRoutes);

// Puerto correcto para Railway
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
