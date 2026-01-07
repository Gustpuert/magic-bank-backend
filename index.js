require("dotenv").config();

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { Pool } = require("pg");

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
 * PRODUCTOS ACADEMY / UNIVERSITY
 * =========================
 */
const ACADEMY_PRODUCTS = [
  315067943, // Italiano
  315067695, // Portugues
  315067368, // Chino
  315067066, // Aleman
  310596602, // Cocina
  310593279, // Nutrición
  310561138, // ChatGPT
  310587272, // Inglés
  310589317, // Francés
  314360954, // Artes y oficios
];

const UNIVERSITY_PRODUCTS = [
  315062968, // Desarrollo software
  315062639, // Marketing
  315061516, // Contaduría
  315061240, // Derecho
  315058790, // Administración y Negocios
];

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
 * CRON – CHECK ORDERS
 * =========================
 */
app.get("/cron/check-orders", async (req, res) => {
  try {
    const storeResult = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
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
    let academyEnrollments = 0;
    let checked = 0;

    for (const order of orders) {
      checked++;
      const orderId = order.id;
      const email = order.customer.email;

      for (const item of order.products) {
        const productId = item.product_id;
        const productName = item.name;

        if (ACADEMY_PRODUCTS.includes(productId)) {
          const exists = await pool.query(
            "SELECT 1 FROM academy_enrollments WHERE order_id = $1 AND product_id = $2",
            [orderId, productId]
          );

          if (exists.rows.length > 0) continue;

          const enrollment = await pool.query(
            `
            INSERT INTO academy_enrollments
            (order_id, product_id, product_name, customer_email)
            VALUES ($1,$2,$3,$4)
            RETURNING id
            `,
            [orderId, productId, productName, email]
          );

          const token = crypto.randomBytes(32).toString("hex");

          await pool.query(
            `
            INSERT INTO access_tokens
            (enrollment_type, enrollment_id, token, used)
            VALUES ('academy', $1, $2, false)
            `,
            [enrollment.rows[0].id, token]
          );

          console.log("🔗 Link mágico:", `https://magicbank.app/access/${token}`);
          academyEnrollments++;
        }
      }
    }

    res.json({
      status: "OK",
      orders_checked: checked,
      academy_enrollments_created: academyEnrollments,
    });
  } catch (err) {
    console.error("CRON ERROR:", err.message);
    res.status(500).json({ error: "Failed to check orders" });
  }
});

/**
 * =========================
 * ACCESS LINK (MAGIC LINK)
 * =========================
 */
app.get("/access/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `
      SELECT * FROM access_tokens
      WHERE token = $1 AND used = false
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Link inválido o expirado");
    }

    const access = result.rows[0];

    await pool.query(
      "UPDATE access_tokens SET used = true WHERE id = $1",
      [access.id]
    );

    if (access.enrollment_type === "academy") {
      return res.redirect("https://academy.magicbank.app");
    }

    if (access.enrollment_type === "university") {
      return res.redirect("https://university.magicbank.app");
    }

    res.send("Acceso procesado");
  } catch (err) {
    console.error("ACCESS ERROR:", err.message);
    res.status(500).send("Error de acceso");
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
