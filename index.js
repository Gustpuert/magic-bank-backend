require("dotenv").config();

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());

/* =========================
   DATABASE
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (_, res) => {
  res.send("MagicBank Backend OK");
});

/* =========================
   STEP 1 - START OAUTH
   (LINK DE INSTALACIÓN)
========================= */
app.get("/auth/tiendanube", (req, res) => {
  const redirectUrl =
    `https://www.tiendanube.com/apps/authorize` +
    `?client_id=${process.env.TIENDANUBE_CLIENT_ID}` +
    `&redirect_uri=${process.env.APP_URL}/auth/tiendanube/callback` +
    `&response_type=code`;

  res.redirect(redirectUrl);
});

/* =========================
   STEP 2 - OAUTH CALLBACK
========================= */
app.get("/auth/tiendanube/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      console.error("❌ Missing OAuth code");
      return res.status(400).send("Missing code");
    }

    const tokenResponse = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      }
    );

    const { access_token, user_id } = tokenResponse.data;

    if (!access_token || !user_id) {
      console.error("❌ Invalid token response", tokenResponse.data);
      return res.status(500).send("Invalid token response");
    }

    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1, $2)
      ON CONFLICT (store_id)
      DO UPDATE SET access_token = EXCLUDED.access_token
      `,
      [user_id, access_token]
    );

    console.log("✅ OAuth OK | Store:", user_id);

    res.send("App instalada correctamente");
  } catch (err) {
    console.error("❌ OAuth error:", err.response?.data || err.message);
    res.status(500).send("Error OAuth Tiendanube");
  }
});

/* =========================
   STEP 3 - CREATE WEBHOOK
========================= */
app.get("/setup/tiendanube/webhook", async (_, res) => {
  try {
    const result = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    if (!result.rowCount) {
      return res.status(500).send("No store configured");
    }

    const { store_id, access_token } = result.rows[0];

    await axios.post(
      `https://api.tiendanube.com/v1/${store_id}/webhooks`,
      {
        event: "order/paid",
        url: `${process.env.APP_URL}/webhooks/tiendanube/order-paid`,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "MagicBank",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Webhook order/paid created");
    res.send("Webhook creado correctamente");
  } catch (err) {
    console.error("❌ Webhook error:", err.response?.data || err.message);
    res.status(500).send("Error creando webhook");
  }
});

/* =========================
   PRODUCT CATALOG (CANÓNICO)
========================= */
const PRODUCTS = {
  315067943: { area: "academy", nombre: "Italiano", url: "https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb" },
  310587272: { area: "academy", nombre: "Inglés", url: "https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622-tutor-de-ingles-magicbank" },
  315061240: { area: "university", nombre: "Derecho", url: "https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786-abogadus-magic-tutor-pro" },
  316686073: { area: "tutor", nombre: "Sensei", url: "https://chatgpt.com/g/g-69547fda3efc81918ba83ac2b0ec7af7-sensei-magic-tutor-pro" },
};

/* =========================
   WEBHOOK order/paid
========================= */
app.post("/webhooks/tiendanube/order-paid", async (req, res) => {
  try {
    const orderId = req.body.id;
    if (!orderId) return res.sendStatus(200);

    const storeRes = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    const { store_id, access_token } = storeRes.rows[0];

    const orderRes = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "MagicBank",
        },
      }
    );

    const order = orderRes.data;
    const email = order.contact_email;
    const productId = order.products[0].product_id;

    const product = PRODUCTS[productId];
    if (!product) {
      console.warn("⚠️ Product not mapped:", productId);
      return res.sendStatus(200);
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `
      INSERT INTO access_tokens
      (token, email, product_id, product_name, area, redirect_url, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [token, email, productId, product.nombre, product.area, product.url, expires]
    );

    console.log("🎟️ Access token created for", email);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ order-paid error:", err.message);
    res.sendStatus(200);
  }
});

/* =========================
   ACCESS LINK
========================= */
app.get("/access/:token", async (req, res) => {
  const result = await pool.query(
    `
    SELECT redirect_url
    FROM access_tokens
    WHERE token=$1 AND expires_at > NOW()
    `,
    [req.params.token]
  );

  if (!result.rowCount) {
    return res.status(403).send("Acceso inválido o expirado");
  }

  res.redirect(result.rows[0].redirect_url);
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on ${PORT}`);
});
