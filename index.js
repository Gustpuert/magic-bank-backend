const express = require("express");
const cors = require("cors");

const studentRoutes = require("./api/students");
const authRoutes = require("./api/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Magic Bank Backend activo" });
});

// Rutas
app.use("/api", authRoutes);
app.use("/api", studentRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
