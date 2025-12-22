const express = require("express");
const cors = require("cors");

const magicbankAulaRoutes = require("./api/magicbank/aula/aula.routes");

const app = express();

// 🚨 ESTO ES CLAVE EN RAILWAY
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("MagicBank Backend activo");
});

// MagicBank Aula
app.use("/api/magicbank/aula", magicbankAulaRoutes);

// 🚨 MUY IMPORTANTE
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
