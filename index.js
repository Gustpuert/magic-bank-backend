const express = require("express");
const cors = require("cors");

const aulaRoutes = require("./api/magicbank/aula/aula.routes");
const authRoutes = require("./api/magicbank/auth/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.use("/api/magicbank/aula", aulaRoutes);
app.use("/api/magicbank/auth", authRoutes);

const PORT = process.env.PORT;

if (!PORT) {
  console.error("PORT no definido");
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MagicBank backend activo en puerto ${PORT}`);
});
