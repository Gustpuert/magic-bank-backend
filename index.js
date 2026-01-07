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
 * PRODUCTOS MAGICBANK ACADEMY
 * ID → Nombre humano (solo informativo)
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
 * CRON – CHECK ORDERS (ACADEMY)
 * Este endpoint lo llama el cron cada 5 minutos
 * =========================
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

      // 3. Evitar reprocesar órdenes
      const exists = await pool.query(
        `SELECT 1 FROM processed_orders WHERE order_id = $1`,
        [orderId]
      );

      if (exists.rows.length > 0) continue;

      // 4. Procesar productos de la orden
      for (const item of order.products) {
        const productId = item.product_id;

        if (ACADEMY_PRODUCTS[productId]) {
          const productName = ACADEMY_PRODUCTS[productId];

          // 👉 AQUÍ VA LA ACTIVACIÓN AUTOMÁTICA
          // - Crear acceso Academy
          // - Enviar email
          // - Redirigir al tutor correspondiente
          console.log(
            `🎓 ACADEMY | Orden ${orderId} → ${productName} (${productId})`
          );
        }
      }

      // 5. Marcar orden como procesada
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
  } catch (error) {
    console.error(
      "Order check error:",
      error.response?.data || error.message
    );
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
