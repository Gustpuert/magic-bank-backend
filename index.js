const express = require("express");
const app = express();

app.use(express.json());

// Rutas
const aulaRoutes = require("./api/magicbank/aula/aula.routes");
app.use("/aula", aulaRoutes);

// Puerto
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ MagicBank Backend corriendo en puerto ${PORT}`);
});
