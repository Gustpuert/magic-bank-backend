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

    console.log("EMAIL ENVIADO:", destino);
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
   DEBUG CORREO
========================= */
app.get("/debug/email", async (_, res) => {
  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from: "MagicBank <info@send.magicbank.org>",
        to: "gustavopuerta@yahoo.com",
        subject: "TEST RESEND",
        html: "<b>Correo funcionando</b>",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.send("EMAIL OK");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send(err.response?.data || err.message);
  }
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
   CATALOGO COMPLETO
========================= */
const CATALOGO = {
1395732685:{nombre:"Italiano",area:"academy",url:"https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb"},
1395731561:{nombre:"Portugués",area:"academy",url:"https://chatgpt.com/g/g-694ff45ee8a88191b72cd536885b0876-tutor-de-portugues-mb"},
1395730081:{nombre:"Chino",area:"academy",url:"https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin"},
1395728497:{nombre:"Alemán",area:"academy",url:"https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-tutor-de-aleman-mb"},
1378551257:{nombre:"Inglés",area:"academy",url:"https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622"},
1378561580:{nombre:"Francés",area:"academy",url:"https://chatgpt.com/g/g-692af8c0b460819197c6c780bb96aaed"},
1395710455:{nombre:"Facultad Derecho",area:"university",url:"https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786"},
1395711401:{nombre:"Facultad Contaduría",area:"university",url:"https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f"},
1395718843:{nombre:"Marketing",area:"university",url:"https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64"},
1395720099:{nombre:"Desarrollo software",area:"university",url:"https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e"},
1404599981:{nombre:"TAP Salud",area:"tutor",url:"https://chatgpt.com/g/g-69593c44a6c08191accf43d956372325"},
1404612037:{nombre:"TAP Educación",area:"tutor",url:"https://chatgpt.com/g/g-6959471996e4819193965239320a5daa"},
1404615645:{nombre:"TAP Administración",area:"tutor",url:"https://chatgpt.com/g/g-69594ab53b288191bd9ab50247e1a05c"},
1404604729:{nombre:"TAP Derecho",area:"tutor",url:"https://chatgpt.com/g/g-695946138ec88191a7d55a83d238a968"},
1404608913:{nombre:"TAP Ingeniería",area:"tutor",url:"https://chatgpt.com/g/g-695949c461208191b087fe103d72c0ce"},
1405073311:{nombre:"TAP Empresas",area:"tutor",url:"https://chatgpt.com/g/g-695947d7fe30819181bc53041e0c96d2"}
};

/* =========================
   PROCESAR ORDEN PAGADA
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

    const producto = CATALOGO[variantId];
    if (!producto) return console.log("Producto no mapeado:", variantId);

    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO access_tokens
       (token,email,product_id,product_name,area,redirect_url,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW() + interval '30 days')`,
      [token, email, variantId, producto.nombre, producto.area, producto.url]
    );

    await enviarCorreo(email, producto, token);

    console.log("ENTREGA COMPLETADA:", email);

  } catch (err) {
    console.error("Error procesando orden:", err.message);
  }
}

/* =========================
   WEBHOOK TIENDANUBE
========================= */
app.post("/webhooks/tiendanube/order-paid", async (req, res) => {
  res.sendStatus(200);
  const orderId = req.body.id;
  if (!orderId) return;
  procesarOrden(orderId);
});

/* =========================
   LINK DE ACCESO (OCULTA CHATGPT)
========================= */
app.get("/access/:token", async (req, res) => {
  try {

    const result = await pool.query(
      `SELECT id, redirect_url 
       FROM access_tokens 
       WHERE token=$1 
       AND expires_at > NOW()
       AND used = false`,
      [req.params.token]
    );

    if (!result.rowCount) {
      return res.status(403).send("Acceso inválido o ya utilizado");
    }

    const { id, redirect_url } = result.rows[0];

    // marcar token como usado
    await pool.query(
      "UPDATE access_tokens SET used=true WHERE id=$1",
      [id]
    );

    // redirigir al tutor real
    res.redirect(redirect_url);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error acceso tutor");
  }
});

/* =========================
   START
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log("MAGICBANK BACKEND ACTIVO EN PUERTO", PORT);
});
