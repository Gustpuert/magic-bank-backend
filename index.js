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
app.use(express.urlencoded({ extended: true }));

/* =========================
   POSTGRES
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

/* =========================
   OAUTH CALLBACK (SOLO INSTALACIÓN APP)
========================= */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenRes = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const accessToken = tokenRes.data.access_token;
    const storeId = tokenRes.data.user_id;

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
    console.error(err.response?.data || err.message);
    res.status(500).send("OAuth error");
  }
});

/* =========================
   MAPA CANÓNICO DE PRODUCTOS
========================= */
const PRODUCT_MAP = {
  // ===== ACADEMY =====
  310596602: { tipo: "academy", nombre: "Cocina" },
  310593279: { tipo: "academy", nombre: "Nutrición Inteligente" },
  310561138: { tipo: "academy", nombre: "ChatGPT Avanzado" },
  310587272: { tipo: "academy", nombre: "Inglés" },
  310589317: { tipo: "academy", nombre: "Francés" },
  315067695: { tipo: "academy", nombre: "Portugués" },
  315067943: { tipo: "academy", nombre: "Italiano" },
  315067066: { tipo: "academy", nombre: "Alemán" },
  315067368: { tipo: "academy", nombre: "Chino Mandarín" },
  314360954: { tipo: "academy", nombre: "Artes y Oficios" },

  // ===== UNIVERSITY =====
  315058790: { tipo: "university", nombre: "Administración y Negocios" },
  315062639: { tipo: "university", nombre: "Marketing" },
  315061516: { tipo: "university", nombre: "Contaduría" },
  315061240: { tipo: "university", nombre: "Derecho" },
  315062968: { tipo: "university", nombre: "Desarrollo de Software" },

  // ===== FÁBRICA DE TUTORES =====
  316763604: { tipo: "tutor", nombre: "TAP Empresas" },
  316682295: { tipo: "tutor", nombre: "TAP Derecho" },
  316683598: { tipo: "tutor", nombre: "TAP Administración Pública" },
  316681661: { tipo: "tutor", nombre: "TAP Salud" },
  316682798: { tipo: "tutor", nombre: "TAP Ingeniería" },
  316683199: { tipo: "tutor", nombre: "TAP Educación" },
  316686073: { tipo: "tutor", nombre: "Sensei" },
  316684646: { tipo: "tutor", nombre: "SuperTraductor" },
  316685090: { tipo: "tutor", nombre: "BienestarTutor Pro" },
  316685729: { tipo: "tutor", nombre: "MagicBank Council" },
  316193327: { tipo: "tutor", nombre: "Tutor Personalizado" },
};

/* =========================
   PAYMENT SUCCESS (CORAZÓN)
========================= */
app.get("/payment/success", async (req, res) => {
  const { order_id } = req.query;
  if (!order_id) return res.status(400).send("Missing order_id");

  try {
    // 1. Obtener tienda
    const storeRes = await pool.query(
      `SELECT store_id, access_token FROM tiendanube_stores LIMIT 1`
    );
    const { store_id, access_token } = storeRes.rows[0];

    // 2. Obtener orden
    const orderRes = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders/${order_id}`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank (magicbankia@gmail.com)",
        },
      }
    );

    const order = orderRes.data;
    const buyerEmail = order.contact_email;
    const item = order.products[0];
    const productId = item.product_id;

    const producto = PRODUCT_MAP[productId];
    if (!producto) {
      return res.status(400).send("Producto no reconocido");
    }

    // 3. Crear token único
    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `
      INSERT INTO access_tokens (token, email, product_id, product_name, product_type)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [token, buyerEmail, productId, producto.nombre, producto.tipo]
    );

    // 4. Mostrar acceso
    res.send(`
      <h1>Acceso activado</h1>
      <p><strong>${producto.nombre}</strong></p>
      <a href="https://magicbank.org/access/${token}">
        Entrar ahora
      </a>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error procesando el pago");
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
