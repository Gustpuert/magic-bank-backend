require("dotenv").config();

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/* ======================================================
   MIDDLEWARE
====================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================================================
   POSTGRES (Railway)
====================================================== */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ======================================================
   HEALTH CHECK
====================================================== */
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

/* ======================================================
   OAUTH CALLBACK (SOLO INSTALACIÓN DE LA APP)
   ⚠️ NO INTERVIENE EN PAGOS
====================================================== */
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
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("OAuth error");
  }
});

/* ======================================================
   MAPA CANÓNICO DE PRODUCTOS MAGICBANK
   ⚠️ EXACTAMENTE COMO DEFINISTE
====================================================== */
const PRODUCT_MAP = {
  /* ========== ACADEMY (CURSOS) ========== */
  315067943: { area: "academy", nombre: "Italiano" },
  315067695: { area: "academy", nombre: "Portugués" },
  315067368: { area: "academy", nombre: "Chino Mandarín" },
  315067066: { area: "academy", nombre: "Alemán" },
  310587272: { area: "academy", nombre: "Inglés" },
  310589317: { area: "academy", nombre: "Francés" },
  310561138: { area: "academy", nombre: "ChatGPT Avanzado" },
  310596602: { area: "academy", nombre: "Cocina" },
  310593279: { area: "academy", nombre: "Nutrición Inteligente" },
  314360954: { area: "academy", nombre: "Artes y Oficios" },

  /* ========== UNIVERSITY (FACULTADES) ========== */
  315061240: { area: "university", nombre: "Derecho" },
  315061516: { area: "university", nombre: "Contaduría" },
  315062639: { area: "university", nombre: "Marketing" },
  315062968: { area: "university", nombre: "Desarrollo de Software" },
  315058790: { area: "university", nombre: "Administración y Negocios" },

  /* ========== FÁBRICA DE TUTORES (TAPs) ========== */
  316763604: { area: "tutores", nombre: "TAP Empresas" },
  316682295: { area: "tutores", nombre: "TAP Derecho" },
  316683598: { area: "tutores", nombre: "TAP Administración Pública" },
  316681661: { area: "tutores", nombre: "TAP Salud" },
  316682798: { area: "tutores", nombre: "TAP Ingeniería" },
  316683199: { area: "tutores", nombre: "TAP Educación" },
  316686073: { area: "tutores", nombre: "Sensei" },
  316684646: { area: "tutores", nombre: "SuperTraductor" },
  316685090: { area: "tutores", nombre: "BienestarTutor Pro" },
  316685729: { area: "tutores", nombre: "MagicBank Council" },
  316193327: { area: "tutores", nombre: "Tutor Personalizado" },
};

/* ======================================================
   PAYMENT SUCCESS
   🔥 CORAZÓN DE LA AUTOMATIZACIÓN
====================================================== */
app.get("/payment/success", async (req, res) => {
  const { order_id } = req.query;
  if (!order_id) return res.status(400).send("Missing order_id");

  try {
    /* 1️⃣ Obtener tienda y token */
    const storeResult = await pool.query(
      `SELECT store_id, access_token FROM tiendanube_stores LIMIT 1`
    );
    if (storeResult.rows.length === 0) {
      return res.status(500).send("Store not configured");
    }

    const { store_id, access_token } = storeResult.rows[0];

    /* 2️⃣ Consultar orden real en Tiendanube */
    const orderResponse = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders/${order_id}`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank (magicbankia@gmail.com)",
        },
      }
    );

    const order = orderResponse.data;
    const email = order.contact_email;
    const item = order.products[0];
    const productId = item.product_id;

    const producto = PRODUCT_MAP[productId];
    if (!producto) {
      return res.status(400).send("Producto no reconocido en MagicBank");
    }

    /* 3️⃣ Generar token único (30 días, un solo uso) */
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `
      INSERT INTO access_tokens
      (token, email, product_id, product_name, product_area, expires_at, used)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      `,
      [
        token,
        email,
        productId,
        producto.nombre,
        producto.area,
        expiresAt,
      ]
    );

    /* 4️⃣ Mostrar acceso */
    res.send(`
      <h1>Acceso MagicBank activado</h1>
      <p><strong>${producto.nombre}</strong></p>
      <p>Área: ${producto.area}</p>
      <p>Válido por 30 días</p>
      <a href="https://magicbank.org/access/${token}">
        Entrar ahora
      </a>
    `);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Error procesando el pago");
  }
});

/* ======================================================
   START SERVER
====================================================== */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
