/**
 * MagicBank Backend
 * Entry point compatible con Railway
 */

const express = require("express");
const cors = require("cors");

const aulaRoutes = require("./api/magicbank/aula/aula.routes");

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK (CRÍTICO)
   Railway usa "/" implícitamente
========================= */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/* =========================
   API ROUTES
========================= */
app.use("/api/magicbank/aula", aulaRoutes);

/* =========================
   SERVER START
   OBLIGATORIO process.env.PORT
========================= */
const PORT = process.env.PORT;

if (!PORT) {
  console.error("❌ PORT no definido por el entorno");
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ MagicBank Backend corriendo en puerto ${PORT}`);
});
