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
 * =========================
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * =========================
 * PRODUCT MAP (CEREBRO MAGICBANK)
 * =========================
 * 👉 AQUÍ SE DEFINE TODO EL NEGOCIO
 */
const PRODUCT_MAP = {
  // ACADEMY
  315067943: { type: "academy", name: "italiano" },
  315067695: { type: "academy", name: "portugues" },
  315067368: { type: "academy", name: "chino" },
  315067066: { type: "academy", name: "aleman" },
  310587272: { type: "academy", name: "ingles" },
  310589317: { type: "academy", name: "frances" },
  310596602: { type: "academy", name: "cocina" },
  310593279: { type: "academy", name: "nutricion_inteligente" },
  310561138: { type: "academy", name: "chatgpt_avanzado" },
  314360954: { type: "academy", name: "artes_y_oficios" },

  // UNIVERSITY
  315062968: { type: "university", faculty: "software" },
  315062639: { type: "university", faculty: "marketing" },
  315061516: { type: "university", faculty: "contaduria" },
  315061240: { type: "university", faculty: "derecho" },
  315058790: { type: "university", faculty: "administracion_y_negocios" },

  // TUTOR FACTORY
  310401409: { type: "tutor_factory", service: "personalizado" },
};

/**
 * =========================
 * INIT DATABASE (AUTO)
 * =========================
 */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tiendanube_stores (
      id SERIAL PRIMARY KEY,
      store_id BIGINT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processed_orders (
      id SERIAL PRIMARY KEY,
      order_id BIGINT UNIQUE NOT NULL,
      raw_order JSONB NOT NULL,
      processed_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Tablas verificadas / creadas correctamente");
}

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
 * OAUTH CALLBACK (INSTALL ONLY)
 * =========================
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) return res.status(400).send("Missing code");

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

    res.send("MagicBank instalada correctamente");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("OAuth error");
  }
});

/**
 * =========================
 * CRON ENDPOINT
 * =========================
 */
app.get("/cron/check-orders", async (req, res) => {
  try {
    const storeRes = await pool.query(
      `SELECT store_id, access_token FROM tiendanube_stores LIMIT 1`
    );

    if (storeRes.rows.length === 0) {
      return res.status(404).json({ error: "Store not configured" });
    }

    const { store_id, access_token } = storeRes.rows[0];

    const ordersRes = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders?status=paid`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank (magicbankia@gmail.com)",
        },
      }
    );

    let processed = 0;

    for (const order of ordersRes.data) {
      const exists = await pool.query(
        `SELECT 1 FROM processed_orders WHERE order_id = $1`,
        [order.id]
      );

      if (exists.rows.length > 0) continue;

      await pool.query(
        `INSERT INTO processed_orders (order_id, raw_order) VALUES ($1, $2)`,
        [order.id, order]
      );

      for (const item of order.products) {
        const product = PRODUCT_MAP[item.product_id];

        if (!product) continue;

        console.log("🎯 ORDEN:", order.id);
        console.log("📦 PRODUCTO:", product);

        // AQUÍ VA LA AUTOMATIZACIÓN REAL MÁS ADELANTE
      }

      processed++;
    }

    res.json({
      status: "OK",
      orders_found: ordersRes.data.length,
      orders_processed: processed,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to check orders" });
  }
});

/**
 * =========================
 * START SERVER
 * =========================
 */
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MagicBank Backend running on port ${PORT}`);
  });
});
