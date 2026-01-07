require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 8080;

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   POSTGRES (Railway)
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   EMAIL (GMAIL APP PASSWORD)
========================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,     // ejemplo: magicbankia@gmail.com
    pass: process.env.EMAIL_PASSWORD  // contraseña de aplicación
  }
});

/* =========================
   PRODUCTOS ACADEMY (ID → NOMBRE)
========================= */
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
  314360954: "Artes y Oficios"
};

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

/* =========================
   INIT DB (AUTO-CREACIÓN)
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

  console.log("✅ Tablas verificadas / creadas correctamente");
}

/* =========================
   CRON – CHECK ORDERS
========================= */
app.get("/cron/check-orders", async (req, res) => {
  try {
    const storeResult = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    if (storeResult.rows.length === 0) {
      return res.json({ status: "NO_STORE" });
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
    let created = 0;

    for (const order of orders) {
      const exists = await pool.query(
        "SELECT 1 FROM processed_orders WHERE order_id = $1",
        [order.id]
      );
      if (exists.rows.length > 0) continue;

      await pool.query(
        "INSERT INTO processed_orders (order_id) VALUES ($1)",
        [order.id]
      );

      const email = order.customer?.email;

      for (const item of order.products) {
        const productId = item.product_id;
        const productName = ACADEMY_PRODUCTS[productId];

        if (!productName) continue;

        await pool.query(
          `
          INSERT INTO academy_enrollments
          (order_id, product_id, product_name, customer_email)
          VALUES ($1, $2, $3, $4)
          `,
          [order.id, productId, productName, email]
        );

        await transporter.sendMail({
          from: "MagicBank <magicbankia@gmail.com>",
          to: email,
          subject: `Acceso activado: ${productName}`,
          text: `
Hola 👋

Tu acceso a "${productName}" ha sido activado automáticamente.

En breve recibirás las instrucciones finales.

Equipo MagicBank
          `,
        });

        created++;
      }
    }

    res.json({
      status: "OK",
      orders_checked: orders.length,
      academy_enrollments_created: created
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to check orders" });
  }
});

/* =========================
   START
========================= */
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MagicBank Backend running on port ${PORT}`);
  });
});
