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
 * EMAIL TRANSPORTER
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
  console.log("✅ Tabla academy_access lista");
}
initDB();

/**
 * =========================
 * EMAIL FUNCTION
 * =========================
 */
async function sendAcademyEmail(email, productName) {
  const mailOptions = {
    from: `"MagicBank Academy" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Acceso confirmado — MagicBank Academy",
    html: `
      <h2>Bienvenido a MagicBank Academy</h2>
      <p>Tu acceso ha sido activado correctamente.</p>
      <p><strong>Curso adquirido:</strong> ${productName}</p>

      <p>
        En MagicBank no avanzas si no comprendes.
        Tu tutor te acompañará paso a paso.
      </p>

      <p>
        Próximos pasos:<br>
        1. Guarda este correo<br>
        2. Nuestro equipo te contactará si es necesario<br>
        3. Puedes escribirnos en cualquier momento
      </p>

      <hr>
      <p>
        📩 magicbankia@gmail.com<br>
        📱 WhatsApp +57 311 271 1772
      </p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

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
    let emailsSent = 0;

    for (const order of orders) {
      for (const item of order.products) {
        const productId = item.product_id;

        if (ACADEMY_PRODUCTS[productId]) {
          const productName = ACADEMY_PRODUCTS[productId];
          const email = order.customer?.email;

          if (!email) continue;

          const exists = await pool.query(
            `SELECT 1 FROM academy_access WHERE order_id = $1`,
            [order.id]
          );

          if (exists.rows.length > 0) continue;

          await pool.query(
            `
            INSERT INTO academy_access
            (order_id, product_id, product_name, customer_email)
            VALUES ($1, $2, $3, $4)
            `,
            [order.id, productId, productName, email]
          );

          await sendAcademyEmail(email, productName);

          console.log(`📧 Email enviado → ${email} | ${productName}`);
          emailsSent++;
        }
      }
    }

    res.json({ status: "OK", emailsSent });

  } catch (error) {
    console.error("Email automation error:", error.message);
    res.status(500).json({ error: "Email automation failed" });
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
