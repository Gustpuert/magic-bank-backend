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
   HEALTH
========================= */
app.get("/", (_, res) => {
  res.send("MagicBank Backend OK");
});

/* =========================
   OAUTH CALLBACK (CORREGIDO)
========================= */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    const response = await axios.post(
      "https://api.tiendanube.com/v1/oauth/token",
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MagicBank",
        },
      }
    );

    const { access_token, user_id } = response.data;

    if (!access_token || !user_id) {
      console.error("OAuth response inválida:", response.data);
      return res.status(500).send("OAuth inválido");
    }

    // 🔥 BORRAR TOKEN VIEJO Y GUARDAR EL NUEVO
    await pool.query("DELETE FROM tiendanube_stores WHERE store_id = $1", [
      user_id,
    ]);

    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1,$2)
      `,
      [user_id, access_token]
    );

    console.log("✅ Access token nuevo guardado para store:", user_id);

    res.send("App instalada correctamente");
  } catch (err) {
    console.error(
      "❌ Error OAuth:",
      err.response?.data || err.message
    );
    res.status(500).send("Error OAuth Tiendanube");
  }
});

/* =========================
   SETUP WEBHOOK (MANUAL)
========================= */
app.get("/setup/tiendanube/webhook", async (_, res) => {
  try {
    const store = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    if (!store.rowCount) {
      return res.status(500).send("No store or access_token found");
    }

    const { store_id, access_token } = store.rows[0];

    await axios.post(
      `https://api.tiendanube.com/v1/${store_id}/webhooks`,
      {
        event: "order/paid",
        url: "https://magic-bank-backend-production-713e.up.railway.app/webhooks/tiendanube/order-paid",
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "MagicBank",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Webhook order/paid creado");

    res.send("Webhook order/paid creado correctamente");
  } catch (err) {
    console.error(
      "❌ Error creando webhook:",
      err.response?.data || err.message
    );
    res.status(500).send("Error creando webhook");
  }
});

/* =========================
   CATÁLOGO CANÓNICO
========================= */
const PRODUCTS = {
  315067943: { area: "academy", nombre: "Italiano", url: "https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb" },
  310587272: { area: "academy", nombre: "Inglés", url: "https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622-tutor-de-ingles-magicbank" },
  310589317: { area: "academy", nombre: "Francés", url: "https://chatgpt.com/g/g-692b740a32a08191b53be9f92bede4c3-scarlet-french-magic-tutor" },
  315067066: { area: "academy", nombre: "Alemán", url: "https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-tutor-de-aleman-mb" },
  315067368: { area: "academy", nombre: "Chino", url: "https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin" },
  310561138: { area: "academy", nombre: "ChatGPT", url: "https://chatgpt.com/g/g-6925338f45d88191b5c5c2b3080e553a-tutor-especializado" },
  310596602: { area: "academy", nombre: "Cocina", url: "https://chatgpt.com/g/g-6925b1e4cff88191a3e46165e9ab7824-elchef" },
  310593279: { area: "academy", nombre: "Nutrición Inteligente", url: "https://chatgpt.com/g/g-6927446749dc8191913af12801371ec9-tutor-experto-en-nutricion-inteligente" },

  315061240: { area: "university", nombre: "Derecho", url: "https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786-abogadus-magic-tutor-pro" },
  315061516: { area: "university", nombre: "Contaduría", url: "https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f-supercontador-magic-tutor-pro" },
  315062639: { area: "university", nombre: "Marketing", url: "https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64-supermarketer-magic-tutor-pro" },
  315062968: { area: "university", nombre: "Desarrollo de Software", url: "https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e-super-desarrollador-magic-tutor-pro" },
  315058790: { area: "university", nombre: "Administración y Negocios", url: "https://chatgpt.com/g/g-6934d1a2900c8191ab3aafa382225a65-superadministrador-magic-tutor-pro" },
};

/* =========================
   WEBHOOK order.paid
========================= */
app.post("/webhooks/tiendanube/order-paid", async (req, res) => {
  try {
    const orderId = req.body.id;
    if (!orderId) return res.sendStatus(200);

    const store = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );
    const { store_id, access_token } = store.rows[0];

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
    const productId = order.products?.[0]?.product_id;

    const product = PRODUCTS[productId];
    if (!product) return res.sendStatus(200);

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `
      INSERT INTO access_tokens
      (token,email,product_id,product_name,area,redirect_url,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        token,
        email,
        productId,
        product.nombre,
        product.area,
        product.url,
        expires,
      ]
    );

    console.log("🎟️ Token creado para", email);

    res.sendStatus(200);
  } catch (e) {
    console.error("❌ Webhook error:", e.message);
    res.sendStatus(200);
  }
});

/* =========================
   ACCESS
========================= */
app.get("/access/:token", async (req, res) => {
  const result = await pool.query(
    "SELECT redirect_url FROM access_tokens WHERE token=$1 AND expires_at > NOW()",
    [req.params.token]
  );

  if (!result.rowCount) {
    return res.status(403).send("Acceso inválido o expirado");
  }

  res.redirect(result.rows[0].redirect_url);
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on ${PORT}`);
});
