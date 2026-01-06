require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 8080;

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
 * PRODUCTOS CANÓNICOS
 * =========================
 */
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

/**
 * =========================
 * EMAIL TRANSPORT
 * =========================
 */
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * =========================
 * HEALTH
 * =========================
 */
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

/**
 * =========================
 * CRON — CHECK ORDERS
 * =========================
 */
app.get("/cron/check-orders", async (req, res) => {
  try {
    const storeResult = await pool.query(
      `SELECT store_id, access_token FROM tiendanube_stores LIMIT 1`
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: "Store not configured" });
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
    let processed = 0;

    for (const order of orders) {
      const orderId = order.id;

      const exists = await pool.query(
        `SELECT 1 FROM processed_orders WHERE order_id = $1`,
        [orderId]
      );
      if (exists.rows.length > 0) continue;

      const buyerEmail = order.contact_email;
      let productsText = "";

      for (const item of order.products) {
        const product = PRODUCT_MAP[item.product_id];
        if (product) {
          productsText += `• ${product.name} (${product.area})\n`;
        }
      }

      // 📧 ENVÍO DE CORREO
      await mailer.sendMail({
        from: `"MagicBank" <${process.env.EMAIL_USER}>`,
        to: buyerEmail,
        subject: "Acceso confirmado — MagicBank",
        text: `
Gracias por tu compra en MagicBank.

Has adquirido:
${productsText}

Accesos:
University → https://gustpuert.github.io/university.magicbank.org/
Academy → https://academy.magicbank.org
Fábrica de Tutores → https://magicbank.org/fabrica-de-tutores.html

Próximamente recibirás instrucciones personalizadas.

Equipo MagicBank
        `,
      });

      await pool.query(
        `INSERT INTO processed_orders (order_id, raw_order)
         VALUES ($1, $2)`,
        [orderId, order]
      );

      processed++;
    }

    res.json({
      status: "OK",
      orders_found: orders.length,
      orders_processed: processed,
    });
  } catch (err) {
    console.error("CRON error:", err.message);
    res.status(500).json({ error: "Cron failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
