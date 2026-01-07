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
 * PRODUCTOS UNIVERSITY
 * =========================
 */
const UNIVERSITY_PRODUCTS = {
  315062968: "Facultad de Desarrollo de Software",
  315062639: "Facultad de Marketing",
  315061516: "Facultad de Contaduría",
  315061240: "Facultad de Derecho",
  315058790: "Facultad de Administración y Negocios",
};

/**
 * =========================
 * EMAIL CONFIG
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
    CREATE TABLE IF NOT EXISTS university_access (
      id SERIAL PRIMARY KEY,
      order_id BIGINT UNIQUE,
      product_id BIGINT,
      product_name TEXT,
      customer_email TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Tabla university_access lista");
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
    let universityEmailsSent = 0;

    for (const order of orders) {
      const email = order.customer?.email;
      if (!email) continue;

      for (const item of order.products) {
        const productId = item.product_id;

        if (UNIVERSITY_PRODUCTS[productId]) {
          const exists = await pool.query(
            `SELECT 1 FROM university_access WHERE order_id = $1`,
            [order.id]
          );

          if (exists.rows.length === 0) {
            // Guardar acceso
            await pool.query(
              `
              INSERT INTO university_access
              (order_id, product_id, product_name, customer_email)
              VALUES ($1, $2, $3, $4)
              `,
              [order.id, productId, UNIVERSITY_PRODUCTS[productId], email]
            );

            // 📧 ENVIAR EMAIL UNIVERSITY
            await transporter.sendMail({
              from: `"MagicBank University" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: "Acceso confirmado a MagicBank University",
              html: `
                <h2>Bienvenido a MagicBank University</h2>
                <p>
                  Tu acceso a <strong>${UNIVERSITY_PRODUCTS[productId]}</strong>
                  ha sido confirmado correctamente.
                </p>
                <p>
                  En MagicBank University recibirás formación rigurosa,
                  acompañada por tutores especializados guiados por
                  Inteligencia Artificial, con evaluación real y progresiva.
                </p>
                <p>
                  👉 Accede aquí:
                  <br>
                  <a href="https://gustpuert.github.io/tutores.university.magicbank.org/">
                    Entrar a MagicBank University
                  </a>
                </p>
                <p>
                  Este correo confirma tu acceso académico.
                  Conserva este mensaje.
                </p>
              `,
            });

            universityEmailsSent++;
          }
        }
      }
    }

    res.json({
      status: "OK",
      universityEmailsSent,
    });
  } catch (error) {
    console.error("University automation error:", error.message);
    res.status(500).json({ error: "University automation failed" });
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
