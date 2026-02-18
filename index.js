import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import crypto from "crypto";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

/* =========================
   DATABASE
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
/* =========================
   CARGAR CATÁLOGO EN DB AUTOMÁTICO
========================= */

const CATALOGO_BASE = {

  1395732685:{ area:"academy", nombre:"Italiano"},
  1395731561:{ area:"academy", nombre:"Portugués"},
  1395730081:{ area:"academy", nombre:"Chino"},
  1395728497:{ area:"academy", nombre:"Alemán"},
  1378551257:{ area:"academy", nombre:"Inglés"},
  1378561580:{ area:"academy", nombre:"Francés"},

  1404604729:{ area:"tutor", nombre:"TAP Derecho"},
  1404608913:{ area:"tutor", nombre:"TAP Ingeniería"},
  1403228132:{ area:"tutor", nombre:"TAP Salud"},
  1404612037:{ area:"tutor", nombre:"TAP Educación"},
  1404615645:{ area:"tutor", nombre:"TAP Administración"},
  1405073311:{ area:"tutor", nombre:"TAP Empresas"},

  1395710455:{ area:"university", nombre:"Facultad Derecho"},
  1395711401:{ area:"university", nombre:"Facultad Contaduría"},
  1395720099:{ area:"university", nombre:"Desarrollo software"},
  1395718843:{ area:"university", nombre:"Marketing"}
};

async function cargarCatalogoInicial() {
  try {

    const check = await pool.query("SELECT COUNT(*) FROM catalogo");
    const total = parseInt(check.rows[0].count);

    if (total > 0) {
      console.log("CATALOGO YA EXISTE EN DB");
      return;
    }

    console.log("CARGANDO CATALOGO INICIAL...");

    for (const variantId in CATALOGO_BASE) {

      const item = CATALOGO_BASE[variantId];

      await pool.query(
        `INSERT INTO catalogo (variant_id, nombre, area)
         VALUES ($1,$2,$3)`,
        [variantId, item.nombre, item.area]
      );
    }

    console.log("CATALOGO CARGADO AUTOMATICAMENTE");

  } catch (err) {
    console.error("ERROR CARGANDO CATALOGO:", err.message);
  }
}
/* =========================
   RESEND MAIL
========================= */
async function enviarCorreo(destino, producto, token) {
  try {

    await axios.post(
      "https://api.resend.com/emails",
      {
        from: "MagicBank <info@send.magicbank.org>",
        to: destino,
        subject: "Acceso a tu tutor MagicBank",
        html: `
          <h2>Tu acceso está listo</h2>
          <p><b>${producto.nombre}</b></p>
          <a href="https://magic-bank-backend-production-713e.up.railway.app/access/${token}">
            ACCEDER AL TUTOR
          </a>
        `,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (err) {
    console.error("ERROR RESEND:", err.response?.data || err.message);
  }
}

/* =========================
   HEALTHCHECK
========================= */
app.get("/", (_, res) => {
  res.send("MAGICBANK BACKEND ACTIVO");
});

/* =========================
   AUTH TIENDANUBE
========================= */
app.get("/auth/tiendanube", (req, res) => {
  const redirectUri =
    "https://magic-bank-backend-production-713e.up.railway.app/auth/tiendanube/callback";

  const url =
    "https://www.tiendanube.com/apps/24551/authorize" +
    `?response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=read_orders,write_webhooks`;

  res.redirect(url);
});

app.get("/auth/tiendanube/callback", async (req, res) => {
  try {
    const { code } = req.query;

    const response = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: 24551,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri:
          "https://magic-bank-backend-production-713e.up.railway.app/auth/tiendanube/callback",
      }
    );

    const { access_token, user_id } = response.data;

    await pool.query(
      `INSERT INTO tiendanube_stores (store_id, access_token)
       VALUES ($1,$2)
       ON CONFLICT (store_id)
       DO UPDATE SET access_token = EXCLUDED.access_token`,
      [user_id, access_token]
    );

    res.send("Tienda conectada correctamente");

  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.status(500).send("Error OAuth");
  }
});

/* =========================
   PROCESAR ORDEN AUTOMÁTICO
========================= */
async function procesarOrden(orderId) {

  try {

    const store = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    if (!store.rowCount) return;

    const { store_id, access_token } = store.rows[0];

    const order = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders/${orderId}`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank",
          Accept: "application/json",
        },
      }
    );

    if (order.data.payment_status !== "paid") return;

    const email =
      order.data.contact_email ||
      order.data.customer?.email ||
      order.data.billing_address?.email;

    const variantId =
      order.data.order_products?.[0]?.variant_id ||
      order.data.products?.[0]?.variant_id ||
      order.data.line_items?.[0]?.variant_id;

    /* =========================
       CONSULTA CATALOGO DB
    ========================= */

    const cursoDB = await pool.query(
      "SELECT * FROM catalogo WHERE variant_id=$1 AND activo=true",
      [variantId]
    );

    if (!cursoDB.rowCount) {
      console.log("Curso no encontrado en catalogo DB:", variantId);
      return;
    }

    const producto = cursoDB.rows[0];

    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO access_tokens
       (token,email,product_id,product_name,area,redirect_url,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()+interval '30 days')`,
      [token, email, variantId, producto.nombre, producto.area, producto.url]
    );

    await enviarCorreo(email, producto, token);

  } catch (err) {
    console.error("Error procesando orden:", err.message);
  }
}

/* =========================
   WEBHOOK
========================= */
app.post("/webhooks/tiendanube/order-paid", async (req, res) => {
  res.sendStatus(200);
  const orderId = req.body.id;
  if (!orderId) return;
  procesarOrden(orderId);
});

/* =========================
   ACCESO TUTOR
========================= */
app.get("/access/:token", async (req, res) => {

  const result = await pool.query(
    "SELECT redirect_url FROM access_tokens WHERE token=$1 AND expires_at>NOW()",
    [req.params.token]
  );

  if (!result.rowCount)
    return res.status(403).send("Acceso inválido");

  res.redirect(result.rows[0].redirect_url);
});

/* =========================
   START
========================= */
app.listen(PORT, "0.0.0.0", async () => {
  console.log("MAGICBANK BACKEND ACTIVO EN PUERTO", PORT);

  await cargarCatalogoInicial();
});
