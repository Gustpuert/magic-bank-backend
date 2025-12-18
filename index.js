const express = require("express");
const cors = require("cors");

const authRoutes = require("./api/auth");
const tutorConnectorRoutes = require("./api/tutor-connector");
const reportRoutes = require("./api/reports");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Magic Bank Backend activo" });
});

app.use("/api", authRoutes);
app.use("/api", tutorConnectorRoutes);
app.use("/api", reportRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
