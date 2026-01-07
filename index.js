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
 * UNIVERSITY PRODUCTS → TUTORS
 * =========================
 */
const UNIVERSITY_MAP = {
  315058790: {
    name: "Facultad de Administración y Negocios",
    tutor: "https://chatgpt.com/g/g-6934d1a2900c8191ab3aafa382225a65-superadministrador-magic-tutor-pro",
  },
  315061240: {
    name: "Facultad de Derecho",
    tutor: "https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786-abogadus-magic-tutor-pro",
  },
  315061516: {
    name: "Facultad de Contaduría",
    tutor: "https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f-supercontador-magic-tutor-pro",
  },
  315062639: {
    name: "Facultad de Marketing",
    tutor: "https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64-supermarketer-magic-tutor-pro",
  },
  315062968: {
    name: "Facultad de Desarrollo de Software",
    tutor: "https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e-super-desarrollador-magic-tutor-pro",
  },
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
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

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

    let emailsSent = 0;

    for (const order of ordersResponse.data) {
      const email = order.customer?.email;
      if (!email) continue;

      for (const item of order.products) {
        const faculty = UNIVERSITY_MAP[item.product_id];
        if (!faculty) continue;

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
            [order.id, item.product_id, faculty.name, email]
          );

          await transporter.sendMail({
            from: `"MagicBank University" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Acceso confirmado – ${faculty.name}`,
            html: `
              <h2>Acceso confirmado</h2>
              <p>
                Has adquirido <strong>${faculty.name}</strong>.
              </p>
              <p>
                Tu tutor especializado ya está disponible.
              </p>
              <p>
                👉 <a href="${faculty.tutor}">
                  Entrar directamente a tu Tutor
                </a>
              </p>
              <p>
                MagicBank University aplica evaluación real,
                acompañamiento continuo y avance solo por dominio.
              </p>
            `,
          });

          emailsSent++;
        }
      }
    }

    res.json({ status: "OK", emailsSent });
  } catch (error) {
    console.error(error.message);
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
