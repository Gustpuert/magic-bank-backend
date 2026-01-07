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
 * POSTGRES (Railway)
 * =========================
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

/**
 * =========================
 * OAUTH CALLBACK (solo instalación)
 * =========================
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

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

    res.send("MagicBank instalada correctamente");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("OAuth error");
  }
});

/**
 * =========================
 * CRON – CHECK ORDERS
 * =========================
 * Este endpoint lo llama Railway cada 5 minutos
 */
app.get("/cron/check-orders", async (req, res) => {
  try {
    // 1. Obtener tienda
    const storeResult = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: "Store not configured" });
    }

    const { store_id, access_token } = storeResult.rows[0];

    // 2. Obtener TODAS las órdenes (sin filtro incorrecto)
    const ordersResponse = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank (magicbankia@gmail.com)",
        },
      }
    );

    const orders = ordersResponse.data;

    let inserted = 0;

    for (const order of orders) {
      // 3. Solo órdenes pagadas
      if (order.payment_status !== "paid") continue;

      for (const item of order.products) {
        // 4. Solo productos Academy (por ID)
        const academyProductIds = [
          315067943, // Italiano
          315067695, // Portugués
          315067368, // Chino
          315067066, // Alemán
          310596602, // Cocina
          310593279, // Nutrición
          310561138, // ChatGPT
          310587272, // Inglés
          310589317, // Francés
          314360954, // Artes y oficios
        ];

        if (!academyProductIds.includes(item.product_id)) continue;

        // 5. Evitar duplicados
        const exists = await pool.query(
          "SELECT 1 FROM academy_enrollments WHERE order_id = $1",
          [order.id]
        );

        if (exists.rows.length > 0) continue;

        // 6. Insertar inscripción
        await pool.query(
          `
          INSERT INTO academy_enrollments
          (order_id, product_id, product_name, customer_email)
          VALUES ($1, $2, $3, $4)
          `,
          [
            order.id,
            item.product_id,
            item.name,
            order.customer.email,
          ]
        );

        inserted++;
      }
    }

    res.json({
      status: "OK",
      orders_checked: orders.length,
      academy_enrollments_created: inserted,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
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
