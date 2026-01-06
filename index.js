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
 * Postgres connection (Railway)
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * =========================
 * INIT DATABASE (AUTO)
 * =========================
 */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academy_enrollments (
      id SERIAL PRIMARY KEY,
      order_id BIGINT UNIQUE NOT NULL,
      product_id BIGINT NOT NULL,
      product_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ academy_enrollments table ready");
}

initDB();

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
 * OAUTH CALLBACK (SOLO INSTALL)
 * =========================
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing authorization code");

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
      CREATE TABLE IF NOT EXISTS tiendanube_stores (
        store_id BIGINT PRIMARY KEY,
        access_token TEXT NOT NULL
      );
      `
    );

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
 * CRON: CHECK PAID ORDERS
 * =========================
 */
app.get("/cron/check-orders", async (req, res) => {
  try {
    const storeRes = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );
    if (storeRes.rows.length === 0)
      return res.status(404).json({ error: "No store configured" });

    const { store_id, access_token } = storeRes.rows[0];

    const ordersRes = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders?status=paid`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank (magicbankia@gmail.com)",
        },
      }
    );

    let registered = 0;

    for (const order of ordersRes.data) {
      const orderId = order.id;
      const email = order.customer?.email;
      const item = order.items?.[0];

      if (!email || !item) continue;

      try {
        await pool.query(
          `
          INSERT INTO academy_enrollments
          (order_id, product_id, product_name, customer_email)
          VALUES ($1, $2, $3, $4)
          `,
          [orderId, item.product_id, item.name, email]
        );
        registered++;
      } catch (e) {
        // orden duplicada → ignorar
      }
    }

    res.json({
      status: "OK",
      new_academy_enrollments: registered,
    });
  } catch (error) {
    console.error("Cron error:", error.response?.data || error.message);
    res.status(500).json({ error: "Cron failed" });
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
