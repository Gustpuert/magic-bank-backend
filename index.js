require("dotenv").config();

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
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
   MAIL
========================= */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* =========================
   HEALTH
========================= */
app.get("/", (_, res) => {
  res.send("MagicBank Backend OK");
});

/* =========================
   OAUTH START
========================= */
app.get("/auth/tiendanube", (req, res) => {
  const redirectUri =
    "https://magic-bank-backend-production-713e.up.railway.app/auth/tiendanube/callback";

  const url =
    "https://www.tiendanube.com/apps/authorize" +
    `?client_id=24551` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=read_orders,write_webhooks`;

  res.redirect(url);
});

/* =========================
   OAUTH CALLBACK
========================= */
app.get("/auth/tiendanube/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send("Missing code");

    const redirectUri =
      "https://magic-bank-backend-production-713e.up.railway.app/auth/tiendanube/callback";

    const response = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: 24551,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const { access_token, user_id } = response.data;

    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1,$2)
      ON CONFLICT (store_id)
      DO UPDATE SET access_token = EXCLUDED.access_token
      `,
      [user_id, access_token]
    );

    res.send("Aplicación instalada correctamente.");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("OAuth error");
  }
});

/* =========================
   WEBHOOK CREATION
========================= */
app.get("/setup/tiendanube/webhook", async (_, res) => {
  try {
    const store = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    const { store_id, access_token } = store.rows[0];

    await axios.post(
      `https://api.tiendanube.com/v1/${store_id}/webhooks`,
      {
        event: "order/paid",
        url:
          "https://magic-bank-backend-production-713e.up.railway.app/webhooks/tiendanube/order-paid",
      },
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank",
          "Content-Type": "application/json",
        },
      }
    );

    res.send("Webhook order/paid creado correctamente");
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).send("Error creando webhook");
  }
});

/* =========================
   CATÁLOGO COMPLETO
========================= */
const PRODUCTS = {
  /* ACADEMY */
  315067943: { area: "academy", nombre: "Italiano", url: "https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb" },
  310587272: { area: "academy", nombre: "Inglés", url: "https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622" },
  310589317: { area: "academy", nombre: "Francés", url: "https://chatgpt.com/g/g-692b740a32a08191b53be9f92bede4c3" },
  315067066: { area: "academy", nombre: "Alemán", url: "https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4" },

  /* UNIVERSITY */
  315061240: { area: "university", nombre: "Derecho", url: "https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786" },
  315061516: { area: "university", nombre: "Contaduría", url: "https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f" },
  315062639: { area: "university", nombre: "Marketing", url: "https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64" },
  315062968: { area: "university", nombre: "Desarrollo", url: "https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e" },

  /* FÁBRICA DE TUTORES */
  316683598: { area: "tutor", nombre: "TAP Administración", url: "https://chatgpt.com/g/g-69594ab53b288191bd9ab50247e1a05c" },
  316682798: { area: "tutor", nombre: "TAP Ingeniería", url: "https://chatgpt.com/g/g-695949c461208191b087fe103d72c0ce" },
  316763604: { area: "tutor", nombre: "TAP Empresas", url: "https://chatgpt.com/g/g-695947d7fe30819181bc53041e0c96d2" },
  316683199: { area: "tutor", nombre: "TAP Educación", url: "https://chatgpt.com/g/g-6959471996e4819193965239320a5daa" },
  316682295: { area: "tutor", nombre: "TAP Abogados", url: "https://chatgpt.com/g/g-695946138ec88191a7d55a83d238a968" },
  316681661: { area: "tutor", nombre: "TAP Salud", url: "https://chatgpt.com/g/g-69593c44a6c08191accf43d956372325" },
};

/* =========================
   WEBHOOK RECEIVER
========================= */
app.post("/webhooks/tiendanube/order-paid", async (req, res) => {
  try {
    const orderId = req.body.id;
    if (!orderId) return res.sendStatus(200);

    const store = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    const { store_id, access_token } = store.rows[0];

    const order = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders/${orderId}`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank",
        },
      }
    );

    const email = order.data.contact_email;
    const productId = order.data.products?.[0]?.product_id;

    const product = PRODUCTS[productId];
    if (!product) return res.sendStatus(200);

    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `
      INSERT INTO access_tokens
      (token,email,product_id,product_name,area,redirect_url,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW() + interval '30 days')
      `,
      [token, email, productId, product.nombre, product.area, product.url]
    );

    await transporter.sendMail({
      from: `"MagicBank" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Acceso a tu producto MagicBank",
      html: `
        <h2>Gracias por tu compra</h2>
        <p>Producto: <b>${product.nombre}</b></p>
        <p>Acceso:</p>
        <a href="https://magic-bank-backend-production-713e.up.railway.app/access/${token}">
          Acceder ahora
        </a>
      `,
    });

    res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e.message);
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
