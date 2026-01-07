require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   POSTGRES
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   PRODUCT MAPS (IDS)
========================= */

// ACADEMY – CURSOS
const ACADEMY_PRODUCTS = {
  315067943: "Curso de Italiano",
  315067695: "Curso de Portugués",
  315067368: "Curso de Chino",
  315067066: "Curso de Alemán",
  310587272: "Curso de Inglés",
  310589317: "Curso de Francés",
  310596602: "Curso de Cocina",
  310593279: "Curso de Nutrición Inteligente",
  310561138: "Curso Avanzado de ChatGPT",
  314360954: "Artes y Oficios",
  310401409: "Curso Personalizado",
};

// UNIVERSITY – FACULTADES
const UNIVERSITY_PRODUCTS = {
  315062968: "Facultad de Desarrollo de Software",
  315062639: "Facultad de Marketing",
  315061516: "Facultad de Contaduría",
  315061240: "Facultad de Derecho",
  315058790: "Facultad de Administración y Negocios",
};

/* =========================
   INIT DB (AUTO)
========================= */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tiendanube_stores (
      store_id BIGINT PRIMARY KEY,
      access_token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processed_orders (
      order_id BIGINT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS academy_enrollments (
      id SERIAL PRIMARY KEY,
      order_id BIGINT,
      product_id BIGINT,
      product_name TEXT,
      customer_email TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS university_enrollments (
      id SERIAL PRIMARY KEY,
      order_id BIGINT,
      product_id BIGINT,
      faculty_name TEXT,
      customer_email TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Tablas verificadas / creadas correctamente");
}

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

/* =========================
   CRON – CHECK ORDERS
========================= */
app.get("/cron/check-orders", async (req, res) => {
  try {
    const storeResult = await pool.query(
      `SELECT store_id, access_token FROM tiendanube_stores LIMIT 1`
    );

    if (storeResult.rows.length === 0) {
      return res.status(400).json({ error: "No store configured" });
    }

    const { store_id, access_token } = storeResult.rows[0];

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

    let academyCreated = 0;
    let universityCreated = 0;

    for (const order of orders) {
      const orderId = order.id;

      const already = await pool.query(
        `SELECT 1 FROM processed_orders WHERE order_id = $1`,
        [orderId]
      );
      if (already.rows.length > 0) continue;

      const email = order.customer?.email || null;

      for (const item of order.products) {
        const productId = item.product_id;

        // ACADEMY
        if (ACADEMY_PRODUCTS[productId]) {
          await pool.query(
            `
            INSERT INTO academy_enrollments
            (order_id, product_id, product_name, customer_email)
            VALUES ($1, $2, $3, $4)
          `,
            [
              orderId,
              productId,
              ACADEMY_PRODUCTS[productId],
              email,
            ]
          );
          academyCreated++;
        }

        // UNIVERSITY
        if (UNIVERSITY_PRODUCTS[productId]) {
          await pool.query(
            `
            INSERT INTO university_enrollments
            (order_id, product_id, faculty_name, customer_email)
            VALUES ($1, $2, $3, $4)
          `,
            [
              orderId,
              productId,
              UNIVERSITY_PRODUCTS[productId],
              email,
            ]
          );
          universityCreated++;
        }
      }

      await pool.query(
        `INSERT INTO processed_orders (order_id) VALUES ($1)`,
        [orderId]
      );
    }

    res.json({
      status: "OK",
      orders_checked: orders.length,
      academy_enrollments_created: academyCreated,
      university_enrollments_created: universityCreated,
    });
  } catch (error) {
    console.error("❌ Cron error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to check orders" });
  }
});

/* =========================
   START SERVER
========================= */
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MagicBank Backend running on port ${PORT}`);
  });
});
