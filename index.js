require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/**
 * Middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Postgres connection
 * Railway inyecta DATABASE_URL
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/**
 * OAuth Callback Tiendanube
 * SOLO se usa al instalar la app
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  try {
    const tokenResponse = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const accessToken = tokenResponse.data.access_token;
    const storeId = tokenResponse.data.user_id;

    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1, $2)
      ON CONFLICT (store_id)
      DO UPDATE SET access_token = EXCLUDED.access_token
      `,
      [storeId, accessToken]
    );

    res.send("MagicBank instalada correctamente en Tiendanube");
  } catch (error) {
    console.error("OAuth error:", error.response?.data || error.message);
    res.status(500).send("OAuth error");
  }
});

/**
 * 🔔 WEBHOOK: Orden pagada
 * Tiendanube enviará aquí los pagos confirmados
 */
app.post("/webhooks/order-paid", async (req, res) => {
  try {
    const order = req.body;

    console.log("💰 NUEVO PAGO RECIBIDO");
    console.log("Order ID:", order.id);
    console.log("Email:", order.contact_email);
    console.log("Total:", order.total);
    console.log("Items:", order.products);

    // (Por ahora solo registramos el evento)
    // Luego aquí activaremos accesos automáticamente

    res.status(200).send("Webhook recibido correctamente");
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.status(500).send("Webhook processing error");
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
