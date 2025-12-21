const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

console.log("🟢 MagicBank Backend iniciado");

app.get("/", (req, res) => {
  console.log("📥 GET / recibido");
  res.json({ ok: true });
});

app.post("/api/contact", (req, res) => {
  console.log("📩 POST /api/contact recibido");
  console.log("BODY:", req.body);

  res.status(500).json({
    success: false,
    error: "Prueba de log"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
