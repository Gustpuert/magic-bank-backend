const express = require("express");
const cors = require("cors");

const authRoutes = require("./api/auth/auth.routes");
const paymentRoutes = require("./api/payments/payments.routes");

const app = express();

app.use(cors());
app.use(express.json());

/* Health */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/* AUTH */
app.use("/api/auth", authRoutes);

/* PAYMENTS */
app.use("/api/payments", paymentRoutes);

/* PORT */
const PORT = process.env.PORT;

if (!PORT) {
  console.error("PORT no definido");
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MagicBank Backend corriendo en puerto ${PORT}`);
});
