require("dotenv").config();

const express = require("express");
const axios = require("axios");
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
 * POSTGRES (Railway)
 * =========================
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * =========================
 * PRODUCTOS CANÓNICOS MAGICBANK
 * =========================
 * NUNCA SE MODIFICAN SIN CURADURÍA
 */
const PRODUCT_MAP = {
  // MAGICBANK UNIVERSITY
  315058790: { area: "university", name: "Administración y Negocios" },
  315062639: { area: "university", name: "Marketing" },
  315061516: { area: "university", name: "Contaduría" },
  315061240: { area: "university", name: "Derecho" },
  315062968: { area: "university", name: "Desarrollo de Software" },

  // MAGICBANK ACADEMY
  310596602: { area: "academy", name: "Cocina" },
  310593279: { area: "academy", name: "Nutrición Inteligente" },
  310561138: { area: "academy", name: "Curso Avanzado de ChatGPT" },
  310587272: { area: "academy", name: "Inglés" },
  315067695: { area: "academy", name: "Portugués" },
  310589317: { area: "academy", name: "Francés" },
  315067943: { area: "academy", name: "Italiano" },
  315067066: { area: "academy", name: "Alemán" },
  315067368: { area: "academy", name: "Chino" },
  314360954: { area: "academy", name: "Artes y Oficios" },
  308900626: { area: "academy", name: "Pensiones Mágicas" },

  // FÁBRICA DE TUTORES
  310401409: { area: "factory", name: "Tutor Personalizado" },
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
 * OAUTH CALLBACK (SOLO INSTALACIÓN)
 * =========================
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing authorization code");

  try {
    const tokenResponse = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const accessToken = tokenResponse.data.access_token;
    const storeId = tokenResponse.data.user_id;

    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1, $2)
      ON CONFLICT (store_id)
      DO UPDATE SET access_token = EXCLUDED.access_token
      `,
      [storeId, accessToken]
    );

    res.send("MagicBank instalada correctamente en Tiendanube");
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.status(500).send("OAuth error");
  }
});

/**
 * =========================
 * CRON — CONSULTA ÓRDENES PAGADAS
 * =========================
 * ESTE ENDPOINT SE EJECUTA CADA 5 MINUTOS
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

      for (const item of order.products) {
        const productId = item.product_id;
        const product = PRODUCT_MAP[productId];

        if (!product) {
          console.warn("Producto NO reconocido:", productId);
          continue;
        }

        // AQUÍ SE ACTIVA EL ACCESO
        console.log(
          `ACTIVAR → ${product.area.toUpperCase()} | ${product.name}`
        );

        /**
         * FUTURO:
         * - Crear acceso
         * - Enviar email
         * - Generar token privado
         */
      }

      await pool.query(
        `
        INSERT INTO processed_orders (order_id, raw_order)
        VALUES ($1, $2)
        `,
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
    console.error("CRON error:", err.response?.data || err.message);
    res.status(500).json({ error: "Cron failed" });
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
