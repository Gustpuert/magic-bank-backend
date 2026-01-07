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
 * POSTGRES CONNECTION
 * Railway inyecta DATABASE_URL
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

/** MAGICBANK UNIVERSITY */
const UNIVERSITY_PRODUCTS = [
  315058790, // Administración y Negocios
  315061240, // Derecho
  315061516, // Contaduría
  315062639, // Marketing
  315062968, // Desarrollo de Software
];

/** MAGICBANK ACADEMY */
const ACADEMY_PRODUCTS = [
  310596602, // Cocina
  310593279, // Nutrición Inteligente
  310561138, // ChatGPT Avanzado
  310587272, // Inglés
  310589317, // Francés
  315067695, // Portugués
  315067066, // Alemán
  315067368, // Chino
  314360954, // Artes y Oficios
];

/** FÁBRICA DE TUTORES (SE PUEDE EDITAR DESPUÉS SIN PROBLEMA) */
const FACTORY_PRODUCTS = [
  310401409, // Curso Personalizado / Fábrica base
  // AQUÍ SE AGREGAN MÁS IDs CUANDO EXISTAN
];

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
 * OAUTH CALLBACK
 * SOLO SE USA CUANDO SE INSTALA LA APP
 * =========================
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

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
  } catch (error) {
    console.error("OAuth error:", error.response?.data || error.message);
    res.status(500).send("OAuth error");
  }
});

/**
 * =========================
 * CRON ENDPOINT
 * CONSULTA ÓRDENES PAGADAS
 * =========================
 * ESTE ENDPOINT ES LLAMADO CADA 5 MINUTOS DESDE RAILWAY
 */
app.get("/cron/check-orders", async (req, res) => {
  try {
    // 1. Obtener tienda y token
    const storeResult = await pool.query(
      `SELECT store_id, access_token FROM tiendanube_stores LIMIT 1`
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: "No store configured" });
    }

    const { store_id, access_token } = storeResult.rows[0];

    // 2. Consultar órdenes pagadas
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

      // 3. Evitar reprocesar
      const exists = await pool.query(
        `SELECT 1 FROM processed_orders WHERE order_id = $1`,
        [orderId]
      );

      if (exists.rows.length > 0) continue;

      // 4. Identificar producto
      for (const item of order.products) {
        const productId = item.product_id;
        let productType = "unknown";

        if (UNIVERSITY_PRODUCTS.includes(productId)) {
          productType = "university";
        } else if (ACADEMY_PRODUCTS.includes(productId)) {
          productType = "academy";
        } else if (FACTORY_PRODUCTS.includes(productId)) {
          productType = "factory";
        }

        // 5. Guardar orden
        await pool.query(
          `
          INSERT INTO processed_orders (order_id, product_id, product_type, raw_order)
          VALUES ($1, $2, $3, $4)
          `,
          [orderId, productId, productType, order]
        );
      }

      processed++;
    }

    res.json({
      status: "OK",
      orders_found: orders.length,
      orders_processed: processed,
    });
  } catch (error) {
    console.error("Order check error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to check orders" });
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
