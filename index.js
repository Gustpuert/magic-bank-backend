require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/**
 * =========================
 * MIDDLEWARE
 * =========================
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * =========================
 * POSTGRES CONNECTION
 * =========================
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * =========================
 * AUTO-CREATE TABLES
 * (evita manipulación humana)
 * =========================
 */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tiendanube_stores (
      id SERIAL PRIMARY KEY,
      store_id BIGINT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processed_orders (
      id SERIAL PRIMARY KEY,
      order_id BIGINT UNIQUE NOT NULL,
      raw_order JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Tablas verificadas / creadas correctamente");
}

initDB().catch((err) => {
  console.error("❌ Error inicializando DB:", err.message);
});

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/**
 * =========================
 * OAUTH CALLBACK
 * (solo al instalar la app)
 * =========================
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
 * =========================
 * CRON ENDPOINT
 * Consulta órdenes pagadas
 * =========================
 */
app.get("/cron/check-orders", async (req, res) => {
  try {
    // 1. Obtener tienda y token
    const storeResult = await pool.query(
      `SELECT store_id, access_token FROM tiendanube_stores LIMIT 1`
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: "No store configured" });
    }

    const { store_id, access_token } = storeResult.rows[0];

    // 2. Consultar órdenes pagadas
    const ordersResponse = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders?status=paid`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`, // 🔑 CORRECTO
          "User-Agent": "MagicBank (magicbankia@gmail.com)",
        },
      }
    );

    const orders = ordersResponse.data;
    let processed = 0;

    for (const order of orders) {
      const orderId = order.id;

      // 3. Evitar reprocesar órdenes
      const exists = await pool.query(
        `SELECT 1 FROM processed_orders WHERE order_id = $1`,
        [orderId]
      );

      if (exists.rows.length > 0) continue;

      // 4. Guardar orden
      await pool.query(
        `
        INSERT INTO processed_orders (order_id, raw_order)
        VALUES ($1, $2)
        `,
        [orderId, order]
      );

      /**
       * =========================
       * AQUÍ VA LA LÓGICA MAGICBANK
       * =========================
       * - Leer product_id
       * - Mapear a University / Academy / Fábrica
       * - Crear acceso automático
       * - Enviar credenciales
       */

      processed++;
    }

    res.json({
      status: "OK",
      orders_found: orders.length,
      orders_processed: processed,
    });
  } catch (error) {
    console.error(
      "❌ Order check error:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to check orders" });
  }
});

/**
 * =========================
 * START SERVER
 * =========================
 */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
