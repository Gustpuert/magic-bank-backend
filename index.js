require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");

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
 * POSTGRES
 * =========================
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * =========================
 * PRODUCTOS ACADEMY
 * =========================
 */
const ACADEMY_PRODUCTS = {
  315067943: "Curso de Italiano",
  315067695: "Curso de Portugués",
  315067368: "Curso de Chino",
  315067066: "Curso de Alemán",
  310587272: "Curso de Inglés",
  310589317: "Curso de Francés",
  310561138: "Curso Avanzado de ChatGPT",
  310593279: "Curso de Nutrición Inteligente",
  310596602: "Curso de Cocina",
  314360954: "Artes y Oficios",
  308900626: "Pensiones Mágicas",
  310401409: "Curso Personalizado"
};

/**
 * =========================
 * PRODUCTOS UNIVERSITY
 * =========================
 */
const UNIVERSITY_PRODUCTS = {
  315062968: "Facultad de Desarrollo de Software",
  315062639: "Facultad de Marketing",
  315061516: "Facultad de Contaduría",
  315061240: "Facultad de Derecho",
  315058790: "Facultad de Administración y Negocios"
};

/**
 * =========================
 * EMAIL (YA CONFIGURADO)
 * =========================
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * =========================
 * INIT DB
 * =========================
 */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academy_access (
      id SERIAL PRIMARY KEY,
      order_id BIGINT UNIQUE,
      product_id BIGINT,
      product_name TEXT,
      customer_email TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS university_access (
      id SERIAL PRIMARY KEY,
      order_id BIGINT UNIQUE,
      product_id BIGINT,
      product_name TEXT,
      customer_email TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Tablas Academy y University listas");
}
initDB();

/**
 * =========================
 * CRON – CHECK ORDERS
 * =========================
 */
app.get("/cron/check-orders", async (req, res) => {
  try {
    const storeResult = await pool.query(
      `SELECT store_id, access_token FROM tiendanube_stores LIMIT 1`
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: "No store configured" });
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

    let academyActivated = 0;
    let universityActivated = 0;

    for (const order of orders) {
      const email = order.customer?.email;
      if (!email) continue;

      for (const item of order.products) {
        const productId = item.product_id;

        /* ================= ACADEMY ================= */
        if (ACADEMY_PRODUCTS[productId]) {
          const exists = await pool.query(
            `SELECT 1 FROM academy_access WHERE order_id = $1`,
            [order.id]
          );
          if (exists.rows.length === 0) {
            await pool.query(
              `
              INSERT INTO academy_access
              (order_id, product_id, product_name, customer_email)
              VALUES ($1, $2, $3, $4)
              `,
              [order.id, productId, ACADEMY_PRODUCTS[productId], email]
            );
            academyActivated++;
          }
        }

        /* ================= UNIVERSITY ================= */
        if (UNIVERSITY_PRODUCTS[productId]) {
          const exists = await pool.query(
            `SELECT 1 FROM university_access WHERE order_id = $1`,
            [order.id]
          );
          if (exists.rows.length === 0) {
            await pool.query(
              `
              INSERT INTO university_access
              (order_id, product_id, product_name, customer_email)
              VALUES ($1, $2, $3, $4)
              `,
              [order.id, productId, UNIVERSITY_PRODUCTS[productId], email]
            );
            universityActivated++;
          }
        }
      }
    }

    res.json({
      status: "OK",
      academyActivated,
      universityActivated,
    });

  } catch (error) {
    console.error("Automation error:", error.message);
    res.status(500).json({ error: "Automation failed" });
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
