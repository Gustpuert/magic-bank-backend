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
 * UNIVERSITY MAP
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
 * ACADEMY MAP
 * =========================
 */
const ACADEMY_MAP = {
  310596602: {
    name: "Cocina",
    tutor: "https://chatgpt.com/g/g-6925b1e4cff88191a3e46165e9ab7824-elchef",
  },
  310593279: {
    name: "Nutrición Inteligente",
    tutor: "https://chatgpt.com/g/g-694ffee00bb88191b8a708c68b13a0e1-nutricion-inteligente-tutor-pro",
  },
  310561138: {
    name: "ChatGPT Avanzado",
    tutor: "https://chatgpt.com/g/g-6925338f45d88191b5c5c2b3080e553a-tutor-especializado",
  },
  310587272: {
    name: "Inglés",
    tutor: "https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622-tutor-de-ingles-magicbank",
  },
  310589317: {
    name: "Francés",
    tutor: "https://chatgpt.com/g/g-692b740a32a08191b53be9f92bede4c3-scarlet-french-magic-tutor",
  },
  315067943: {
    name: "Italiano",
    tutor: "https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-profesor-de-italiano",
  },
  315067695: {
    name: "Portugués",
    tutor: "https://chatgpt.com/g/g-694ff45ee8a88191b72cd536885b0876-profesor-de-portugues",
  },
  315067066: {
    name: "Alemán",
    tutor: "https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-profesor-de-aleman",
  },
  315067368: {
    name: "Chino Mandarín",
    tutor: "https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin",
  },
  314360954: {
    name: "Artes y Oficios",
    tutor: "https://chatgpt.com/g/g-69482335eefc81918355d1df644de6d0-artesyoficios-tutor-pro",
  },
  308900626: {
    name: "Pensiones Mágicas",
    tutor: "https://chatgpt.com/g/g-6927e4527ac881919cf2697da6dd674b-tutor-oficial-de-pensiones-magicas-magicbank",
  },
  310401409: {
    name: "Curso Personalizado",
    tutor: "https://magicbank.org/fabrica-de-tutores.html",
  },
};

/**
 * =========================
 * EMAIL
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
 * CRON CHECK ORDERS
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
        const product =
          UNIVERSITY_MAP[item.product_id] ||
          ACADEMY_MAP[item.product_id];

        if (!product) continue;

        const exists = await pool.query(
          `SELECT 1 FROM processed_orders WHERE order_id = $1`,
          [order.id]
        );

        if (exists.rows.length === 0) {
          await pool.query(
            `INSERT INTO processed_orders (order_id) VALUES ($1)`,
            [order.id]
          );

          await transporter.sendMail({
            from: `"MagicBank" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Acceso confirmado – ${product.name}`,
            html: `
              <h2>Acceso confirmado</h2>
              <p>Has adquirido <strong>${product.name}</strong>.</p>
              <p>Tu tutor ya está disponible:</p>
              <p>
                👉 <a href="${product.tutor}">
                  Entrar directamente al Tutor
                </a>
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
    res.status(500).json({ error: "Automation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
