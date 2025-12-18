const express = require("express");
const cors = require("cors");

const authRoutes = require("./api/auth");
const studentRoutes = require("./api/students");
const tutorConnectorRoutes = require("./api/tutor-connector");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Magic Bank Backend activo" });
});

app.use("/api", authRoutes);
app.use("/api", studentRoutes);
app.use("/api", tutorConnectorRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
