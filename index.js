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
 * PRODUCTOS MAGICBANK
 * =========================
 */
const PRODUCTS = {
  // ===== ACADEMY =====
  310596602: { name: "Curso de Cocina", type: "academy" },
  310593279: { name: "Nutrición Inteligente", type: "academy" },
  310561138: { name: "ChatGPT Avanzado", type: "academy" },
  310587272: { name: "Curso de Inglés", type: "academy" },
  310589317: { name: "Curso de Francés", type: "academy" },
  315067695: { name: "Curso de Portugués", type: "academy" },
  315067943: { name: "Curso de Italiano", type: "academy" },
  315067066: { name: "Curso de Alemán", type: "academy" },
  315067368: { name: "Curso de Chino", type: "academy" },
  314360954: { name: "Artes y Oficios", type: "academy" },

  // ===== UNIVERSITY =====
  315058790: { name: "Administración y Negocios", type: "university" },
  315061240: { name: "Derecho", type: "university" },
  315061516: { name: "Contaduría", type: "university" },
  315062639: { name: "Marketing", type: "university" },
  315062968: { name: "Desarrollo de Software", type: "university" },

  // ===== FÁBRICA DE TUTORES =====
  316681661: { name: "TAP Salud", type: "factory" },
  316683199: { name: "TAP Educación", type: "factory" },
  316683598: { name: "TAP Administración Pública", type: "factory" },
  316682295: { name: "TAP Derecho", type: "factory" },
  316682798: { name: "TAP Ingeniería", type: "factory" },
  316763604: { name: "TAP Empresas", type: "factory" },
  316686073: { name: "Sensei", type: "factory" },
  316684646: { name: "SuperTraductor", type: "factory" },
  316685090: { name: "Bienestar Tutor Pro", type: "factory" },
  316685729: { name: "MagicBank Council", type: "factory" },
  316193327: { name: "Tutor Personalizado", type: "factory" },
};

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
 * ACTIVATE ACCESS (CORE)
 * =========================
 */
app.post("/activate/access", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email requerido" });
  }

  try {
    // 1️⃣ Obtener tienda y token
    const storeResult = await pool.query(
      `SELECT store_id, access_token FROM tiendanube_stores LIMIT 1`
    );

    if (storeResult.rows.length === 0) {
      return res.status(500).json({ error: "Tienda no configurada" });
    }

    const { store_id, access_token } = storeResult.rows[0];

    // 2️⃣ Consultar órdenes pagadas
    const ordersResponse = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders?status=paid`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank (magicbankia@gmail.com)",
        },
      }
    );

    const orders = ordersResponse.data.filter(
      (o) => o.customer?.email === email
    );

    const accesses = [];

    for (const order of orders) {
      const orderId = order.id;

      // 3️⃣ Evitar reprocesar orden
      const exists = await pool.query(
        `SELECT 1 FROM processed_orders WHERE order_id = $1`,
        [orderId]
      );
      if (exists.rows.length > 0) continue;

      // 4️⃣ Procesar productos
      for (const item of order.items) {
        const productId = item.product_id;
        const product = PRODUCTS[productId];

        if (!product) continue;

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // Membresía mensual

        await pool.query(
          `
          INSERT INTO user_access
          (email, product_id, product_name, access_token, expires_at, single_session)
          VALUES ($1,$2,$3,$4,$5,true)
          `,
          [
            email,
            productId,
            product.name,
            token,
            expiresAt,
          ]
        );

        accesses.push({
          product_id: productId,
          product_name: product.name,
          access_url: `https://magicbank.org/acceso/${token}`,
        });
      }

      // 5️⃣ Marcar orden procesada
      await pool.query(
        `
        INSERT INTO processed_orders (order_id, email)
        VALUES ($1,$2)
        `,
        [orderId, email]
      );
    }

    res.json({
      status: "OK",
      email,
      accesses,
    });
  } catch (error) {
    console.error("Activation error:", error.response?.data || error.message);
    res.status(500).json({ error: "Error activando accesos" });
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
