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
 * Postgres (Railway)
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * =========================
 * PRODUCTOS ACADEMY (IDs)
 * =========================
 */
const ACADEMY_PRODUCTS = {
  315067943: "Italiano",
  315067695: "Portugués",
  315067368: "Chino",
  315067066: "Alemán",
  310587272: "Inglés",
  310589317: "Francés",
  310596602: "Cocina",
  310593279: "Nutrición Inteligente",
  310561138: "ChatGPT Avanzado",
  314360954: "Artes y Oficios",
  310401409: "Curso Personalizado",
};

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
 * INIT DB (AUTOMÁTICO)
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
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS academy_enrollments (
      id SERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL,
      product_id BIGINT NOT NULL,
      course_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (order_id, product_id)
    );
  `);

  console.log("✅ Tablas verificadas / creadas correctamente");
}

initDB();

/**
 * =========================
 * CRON – CHECK ORDERS
 * =========================
 */
app.get("/cron/check-orders", async (req, res) => {
  try {
    // 1. Obtener tienda
    const storeResult = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    if (storeResult.rows.length === 0) {
      return res.status(400).json({ error: "No store configured" });
    }

    const { store_id, access_token } = storeResult.rows[0];

    // 2. Consultar órdenes pagadas
    const ordersResponse = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders?status=paid`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank (magicbankia@gmail.com)",
        },
      }
    );

    const orders = ordersResponse.data;
    let enrollments = 0;

    for (const order of orders) {
      const orderId = order.id;

      // Evitar reprocesar orden
      const existsOrder = await pool.query(
        "SELECT 1 FROM processed_orders WHERE order_id = $1",
        [orderId]
      );

      if (existsOrder.rows.length > 0) continue;

      const email = order.customer?.email;
      if (!email) continue;

      // 3. Revisar productos
      for (const item of order.products) {
        const productId = item.product_id;

        if (ACADEMY_PRODUCTS[productId]) {
          await pool.query(
            `
            INSERT INTO academy_enrollments
            (order_id, product_id, course_name, customer_email)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT DO NOTHING
            `,
            [
              orderId,
              productId,
              ACADEMY_PRODUCTS[productId],
              email,
            ]
          );

          enrollments++;
        }
      }

      // Marcar orden como procesada
      await pool.query(
        "INSERT INTO processed_orders (order_id) VALUES ($1) ON CONFLICT DO NOTHING",
        [orderId]
      );
    }

    res.json({
      status: "OK",
      orders_checked: orders.length,
      academy_enrollments_created: enrollments,
    });
  } catch (error) {
    console.error("❌ Cron error:", error.response?.data || error.message);
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
