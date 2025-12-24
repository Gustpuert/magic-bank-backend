const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta base de prueba
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

// 🔴 RUTA CORREGIDA (ESTA ERA LA CAUSA DEL ERROR)
app.use(
  "/api/magicbank/aula",
  require("./api/magicbank/aula/aula.routes")
);

// Puerto Railway
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
