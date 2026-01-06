require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   DATABASE
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   PRODUCT MAP
========================= */
const PRODUCT_MAP = {
  315058790: { area: "university", name: "Administración y Negocios" },
  315062639: { area: "university", name: "Marketing" },
  315061516: { area: "university", name: "Contaduría" },
  315061240: { area: "university", name: "Derecho" },
  315062968: { area: "university", name: "Desarrollo de Software" },

  310596602: { area: "academy", name: "Cocina" },
  310593279: { area: "academy", name: "Nutrición Inteligente" },
  310561138: { area: "academy", name: "ChatGPT Avanzado" },
  310587272: { area: "academy", name: "Inglés" },
  315067695: { area: "academy", name: "Portugués" },
  310589317: { area: "academy", name: "Francés" },
  315067943: { area: "academy", name: "Italiano" },
  315067066: { area: "academy", name: "Alemán" },
  315067368: { area: "academy", name: "Chino" },
  314360954: { area: "academy", name: "Artes y Oficios" },
  308900626: { area: "academy", name: "Pensiones Mágicas" },

  310401409: { area: "factory", name: "Tutor Personalizado" },
};

/* =========================
   EMAIL
========================= */
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* =========================
   HEALTH
========================= */
app.get("/", (_, res) => res.send("MagicBank Backend OK"));

/* =========================
   CRON — CHECK ORDERS
========================= */
app.get("/cron/check-orders", async (_, res) => {
  try {
    const storeRes = await pool.query(
      `SELECT store_id, access_token FROM tiendanube_stores LIMIT 1`
    );
    if (!storeRes.rows.length) {
      return res.status(404).json({ error: "Store not configured" });
    }

    const { store_id, access_token } = storeRes.rows[0];

    const ordersRes = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders?status=paid`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank",
        },
      }
    );

    let processed = 0;

    for (const order of ordersRes.data) {
      const exists = await pool.query(
        `SELECT 1 FROM processed_orders WHERE order_id=$1`,
        [order.id]
      );
      if (exists.rows.length) continue;

      for (const item of order.products) {
        const product = PRODUCT_MAP[item.product_id];
        if (!product) continue;

        const token = crypto.randomBytes(8).toString("hex");
        const accessLink = `https://magicbank.org/acceso?token=${token}`;

        await pool.query(
          `
          INSERT INTO access_tokens (email, product_id, area, token)
          VALUES ($1, $2, $3, $4)
          `,
          [order.contact_email, item.product_id, product.area, token]
        );

        await mailer.sendMail({
          from: `"MagicBank" <${process.env.EMAIL_USER}>`,
          to: order.contact_email,
          subject: "Tu acceso privado a MagicBank",
          text: `
Bienvenido a MagicBank.

Has adquirido: ${product.name}

Accede usando este enlace privado:
${accessLink}

Este acceso es personal y no transferible.

Equipo MagicBank
          `,
        });
      }

      await pool.query(
        `INSERT INTO processed_orders (order_id, raw_order)
         VALUES ($1, $2)`,
        [order.id, order]
      );

      processed++;
    }

    res.json({ status: "OK", processed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cron error" });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 MagicBank Backend running on port ${PORT}`)
);
