const express = require("express");
const cors = require("cors");

const aulaRoutes = require("./api/magicbank/aula/aula.routes");

const app = express();

/* Middlewares */
app.use(cors());
app.use(express.json());

/* Ruta de health check (OBLIGATORIA para Railway) */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/* Rutas API */
app.use("/api/magicbank/aula", aulaRoutes);

/* Puerto Railway */
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
