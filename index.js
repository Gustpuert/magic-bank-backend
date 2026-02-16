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
            ACCEDER
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
   TEST EMAIL RESEND
========================= */
app.get("/debug/send-test", async (_, res) => {
  try {
    const producto = {
      nombre: "Prueba tutor MagicBank",
      area: "test",
      url: "https://chatgpt.com"
    };

    const token = "test123";

    await enviarCorreo(
      "gustavopuerta@yahoo.com",
      producto,
      token
    );

    res.send("Correo de prueba enviado");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error enviando correo");
  }
});

/* =========================
   CREAR WEBHOOK AUTOMATICO
========================= */
app.get("/setup-webhook", async (_, res) => {
  try {
    const store = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    if (!store.rowCount) {
      return res.status(400).send("No hay tienda conectada");
    }

    const { store_id, access_token } = store.rows[0];

    const response = await axios.post(
      `https://api.tiendanube.com/v1/${store_id}/webhooks`,
      {
        event: "order/paid",
        url: "https://magic-bank-backend-production-713e.up.railway.app/webhooks/tiendanube/order-paid",
      },
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("WEBHOOK CREADO:", response.data);

    res.send("Webhook activo");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error creando webhook");
  }
});

/* =========================
   CATALOGO
========================= */
const CATALOGO = {
1395732685:{nombre:"Italiano",area:"academy"},
1395731561:{nombre:"Portugués",area:"academy"},
1395730081:{nombre:"Chino",area:"academy"},
1395728497:{nombre:"Alemán",area:"academy"},
1378551257:{nombre:"Inglés",area:"academy"},
1378561580:{nombre:"Francés",area:"academy"},
1395710455:{nombre:"Facultad Derecho",area:"university"},
1395711401:{nombre:"Facultad Contaduría",area:"university"},
1395718843:{nombre:"Marketing",area:"university"},
1395720099:{nombre:"Desarrollo software",area:"university"},
1404599981:{nombre:"TAP Salud",area:"tutor"},
1404612037:{nombre:"TAP Educación",area:"tutor"},
1404615645:{nombre:"TAP Administración",area:"tutor"},
1404604729:{nombre:"TAP Derecho",area:"tutor"},
1404608913:{nombre:"TAP Ingeniería",area:"tutor"},
1405073311:{nombre:"TAP Empresas",area:"tutor"}
};

/* =========================
   CHAT TUTOR IA (NUEVO)
========================= */
app.post("/chat/:productId", async (req, res) => {
  try {
    const { token, message } = req.body;
    const { productId } = req.params;

    // validar acceso
    const access = await pool.query(
      `SELECT * FROM access_tokens 
       WHERE token=$1 AND expires_at > NOW()`,
      [token]
    );

    if (!access.rowCount)
      return res.status(403).send("Acceso inválido");

    const producto = CATALOGO[productId];
    if (!producto)
      return res.status(404).send("Tutor no existe");

    const promptSistema = `
Eres un tutor experto de ${producto.nombre}.
Respondes como profesor profesional.
Explicas paso a paso.
`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: promptSistema },
          { role: "user", content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    res.json({
      reply: response.data.choices[0].message.content,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error en tutor IA");
  }
});

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
       (token,email,product_id,product_name,area,expires_at)
       VALUES ($1,$2,$3,$4,$5,NOW() + interval '30 days')`,
      [token, email, variantId, producto.nombre, producto.area]
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
   START
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log("MAGICBANK BACKEND ACTIVO EN PUERTO", PORT);
});
