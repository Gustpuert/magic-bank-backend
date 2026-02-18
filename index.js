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
   DATABASE (RAILWAY)
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   RESEND MAIL
========================= */
async function enviarCorreo(destino, producto, token) {
  try {
    console.log("ENVIANDO EMAIL A:", destino);
    console.log("TOKEN:", token);
    console.log("PRODUCTO:", producto.nombre);

    await axios.post(
      "https://api.resend.com/emails",
      {
        from: "MagicBank <info@send.magicbank.org>",
        to: destino,
        subject: "Acceso a tu tutor MagicBank",
        html: `
          <h2>Tu acceso está listo</h2>
          <p><b>${producto.nombre}</b></p>
          <p>Haz clic para ingresar:</p>
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

    console.log("EMAIL ENVIADO OK");
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
   DEBUG DB
========================= */
app.get("/debug/db", async (_, res) => {
  try {
    const r = await pool.query("SELECT NOW()");
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

/* =========================
   DEBUG EMAIL
========================= */
app.get("/debug/email", async (_, res) => {
  try {
    await enviarCorreo(
      "gustavopuerta@yahoo.com",
      { nombre: "TEST CURSO" },
      crypto.randomBytes(16).toString("hex")
    );
    res.send("EMAIL OK");
  } catch (err) {
    res.status(500).send(err.message);
  }
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
   CATÁLOGO COMPLETO MAGICBANK
   (NO CAMBIAR LÓGICA DEL INDEX)
========================= */
const CATALOGO = {

  1395732685:{ area:"academy", nombre:"Italiano", url:"https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb"},
  1395731561:{ area:"academy", nombre:"Portugués", url:"https://chatgpt.com/g/g-694ff45ee8a88191b72cd536885b0876-tutor-de-portugues-mb"},
  1395730081:{ area:"academy", nombre:"Chino", url:"https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin"},
  1395728497:{ area:"academy", nombre:"Alemán", url:"https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-tutor-de-aleman-mb"},
  1378551257:{ area:"academy", nombre:"Inglés", url:"https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622"},
  1378561580:{ area:"academy", nombre:"Francés", url:"https://chatgpt.com/g/g-692b740a32a08191b53be9f92bede4c3"},

  1404604729:{ area:"tutor", nombre:"TAP Derecho", url:"https://chatgpt.com/g/g-695946138ec88191a7d55a83d238a968"},
  1404608913:{ area:"tutor", nombre:"TAP Ingeniería", url:"https://chatgpt.com/g/g-695949c461208191b087fe103d72c0ce"},
  1404599981:{ area:"tutor", nombre:"TAP Salud", url:"https://chatgpt.com/g/g-69593c44a6c08191accf43d956372325"},
  1404612037:{ area:"tutor", nombre:"TAP Educación", url:"https://chatgpt.com/g/g-6959471996e4819193965239320a5daa"},
  1404615645:{ area:"tutor", nombre:"TAP Administración", url:"https://chatgpt.com/g/g-69594ab53b288191bd9ab50247e1a05c"},
  1405073311:{ area:"tutor", nombre:"TAP Empresas", url:"https://chatgpt.com/g/g-695947d7fe30819181bc53041e0c96d2"},

  1395710455:{ area:"university", nombre:"Facultad Derecho", url:"https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786"},
  1395711401:{ area:"university", nombre:"Facultad Contaduría", url:"https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f"},
  1395720099:{ area:"university", nombre:"Desarrollo software", url:"https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e"},
  1395718843:{ area:"university", nombre:"Marketing", url:"https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64"}
};

/* =========================
   PROCESAR ORDEN
========================= */
async function procesarOrden(orderId) {
  try {
    console.log("---- PROCESANDO ORDEN ----", orderId);

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

    console.log("ORDER RAW:", JSON.stringify(order.data, null, 2));

    if (order.data.payment_status !== "paid") {
      console.log("ORDEN NO PAGADA");
      return;
    }

    const email =
      order.data.contact_email ||
      order.data.customer?.email ||
      order.data.billing_address?.email;

    const variantId =
      order.data.order_products?.[0]?.variant_id ||
      order.data.products?.[0]?.variant_id ||
      order.data.line_items?.[0]?.variant_id;

    console.log("EMAIL:", email);
    console.log("VARIANT:", variantId);

    const producto = CATALOGO[variantId];

    if (!producto) {
      console.log("PRODUCTO NO MAPEADO:", variantId);
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO access_tokens
       (token,email,product_id,product_name,area,redirect_url,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW() + interval '30 days')`,
      [token, email, variantId, producto.nombre, producto.area, producto.url]
    );

    console.log("TOKEN GUARDADO");

    await enviarCorreo(email, producto, token);

    console.log("ENTREGA COMPLETADA:", email);

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
   ACCESO TUTOR OCULTO
========================= */
app.get("/access/:token", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT redirect_url FROM access_tokens WHERE token=$1 AND expires_at > NOW()",
      [req.params.token]
    );

    if (!result.rowCount) {
      return res.status(403).send("Acceso inválido o expirado");
    }

    res.redirect(result.rows[0].redirect_url);
  } catch (e) {
    res.status(500).send("Error acceso");
  }
});

/* =========================
   START
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log("MAGICBANK BACKEND ACTIVO EN PUERTO", PORT);
});
