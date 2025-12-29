// ==============================
// MagicBank Backend - index.js
// Cláusula canónica: CommonJS
// ==============================

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();

// ------------------------------
// Middlewares
// ------------------------------
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ------------------------------
// Health check
// ------------------------------
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

// ------------------------------
// Tiendanube OAuth CALLBACK
// ------------------------------
app.get("/auth/tiendanube/callback", async (req, res) => {
  try {
    const { code, store_id } = req.query;

    if (!code || !store_id) {
      return res.status(400).json({
        error: "Missing code or store_id",
      });
    }

    // ⚠️ SOLO PRUEBA DE FLUJO
    // Aquí NO intercambiamos aún el token
    // Primero confirmamos que el callback funciona

    return res.json({
      success: true,
      message: "Callback recibido correctamente",
      code,
      store_id,
    });
  } catch (error) {
    console.error("Callback error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------------------
// Webhooks requeridos por Tiendanube
// (obligatorios aunque no los uses aún)
// ------------------------------
app.post("/webhooks/store/redact", (req, res) => {
  return res.status(200).send("OK");
});

app.post("/webhooks/customers/redact", (req, res) => {
  return res.status(200).send("OK");
});

app.post("/webhooks/customers/data_request", (req, res) => {
  return res.status(200).send("OK");
});

// ------------------------------
// Server
// ------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MagicBank Backend corriendo en puerto ${PORT}`);
});
