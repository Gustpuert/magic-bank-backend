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
   CATALOGO COMPLETO
   (variant_id → curso real)
========================= */
const CATALOGO = {
1395732685:{nombre:"Italiano",area:"academy",chatgpt:"g-694ff655ce908191871b8656228b5971"},
1395731561:{nombre:"Portugués",area:"academy",chatgpt:"g-694ff45ee8a88191b72cd536885b0876"},
1395730081:{nombre:"Chino",area:"academy",chatgpt:"g-694fec2d35c88191833aa2af7d92fce0"},
1395728497:{nombre:"Alemán",area:"academy",chatgpt:"g-694ff6db1224819184d471e770ab7bf4"},
1378551257:{nombre:"Inglés",area:"academy",chatgpt:"g-69269540618c8191ad2fcc7a5a86b622"},
1378561580:{nombre:"Francés",area:"academy",chatgpt:"g-692af8c0b460819197c6c780bb96aaed"},
1395710455:{nombre:"Facultad Derecho",area:"university",chatgpt:"g-69345443f0848191996abc2cf7cc9786"},
1395711401:{nombre:"Facultad Contaduría",area:"university",chatgpt:"g-6934af28002481919dd9799d7156869f"},
1395718843:{nombre:"Marketing",area:"university",chatgpt:"g-693703fa8a008191b91730375fcc4d64"},
1395720099:{nombre:"Desarrollo software",area:"university",chatgpt:"g-69356a835d888191bf80e11a11e39e2e"},
1404599981:{nombre:"TAP Salud",area:"tutor",chatgpt:"g-69593c44a6c08191accf43d956372325"},
1404612037:{nombre:"TAP Educación",area:"tutor",chatgpt:"g-6959471996e4819193965239320a5daa"},
1404615645:{nombre:"TAP Administración",area:"tutor",chatgpt:"g-69594ab53b288191bd9ab50247e1a05c"},
1404604729:{nombre:"TAP Derecho",area:"tutor",chatgpt:"g-695946138ec88191a7d55a83d238a968"},
1404608913:{nombre:"TAP Ingeniería",area:"tutor",chatgpt:"g-695949c461208191b087fe103d72c0ce"},
1405073311:{nombre:"TAP Empresas",area:"tutor",chatgpt:"g-695947d7fe30819181bc53041e0c96d2"}
};

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
    console.error("ERROR EMAIL:", err.response?.data || err.message);
  }
}

/* =========================
   HEALTHCHECK
========================= */
app.get("/", (_, res) => {
  res.send("MAGICBANK BACKEND ACTIVO");
});

/* =========================
   API CURSOS INTERNA
========================= */
app.get("/api/cursos/:variant", (req, res) => {
  const curso = CATALOGO[req.params.variant];
  if (!curso) return res.status(404).send("Curso no encontrado");
  res.json(curso);
});

/* =========================
   SETUP WEBHOOK TIENDANUBE
========================= */
app.get("/setup-webhook", async (_, res) => {
  try {
    const store = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    const { store_id, access_token } = store.rows[0];

    await axios.post(
      `https://api.tiendanube.com/v1/${store_id}/webhooks`,
      {
        event: "order/paid",
        url: "https://magic-bank-backend-production-713e.up.railway.app/webhooks/tiendanube/order-paid",
      },
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank",
        },
      }
    );

    res.send("Webhook activo");
  } catch (err) {
    res.status(500).send("Error webhook");
  }
});

/* =========================
   PROCESAR ORDEN PAGADA
========================= */
async function procesarOrden(orderId) {

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
  if (!producto) return;

  const token = crypto.randomBytes(32).toString("hex");

  await pool.query(
    `INSERT INTO access_tokens
     (token,email,product_id,product_name,area,chatgpt_id,expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW()+interval '30 days')`,
    [token, email, variantId, producto.nombre, producto.area, producto.chatgpt]
  );

  await enviarCorreo(email, producto, token);
}

/* =========================
   WEBHOOK TIENDANUBE
========================= */
app.post("/webhooks/tiendanube/order-paid", async (req, res) => {
  res.sendStatus(200);
  procesarOrden(req.body.id);
});

/* =========================
   ACCESS TOKEN VALIDADO
========================= */
app.get("/access/:token", async (req, res) => {

  const result = await pool.query(
    "SELECT chatgpt_id FROM access_tokens WHERE token=$1 AND expires_at > NOW()",
    [req.params.token]
  );

  if (!result.rowCount) return res.status(403).send("Acceso inválido");

  res.redirect(`/tutor/${req.params.token}`);
});

/* =========================
   PROXY TUTOR
   (NO EXPONE LINK CHATGPT)
========================= */
app.get("/tutor/:token", async (req, res) => {

  const result = await pool.query(
    "SELECT chatgpt_id FROM access_tokens WHERE token=$1",
    [req.params.token]
  );

  if (!result.rowCount) return res.status(403).send("Token inválido");

  const chatgptId = result.rows[0].chatgpt_id;

  res.send(`
    <html>
      <body style="margin:0">
        <iframe 
          src="https://chatgpt.com/g/${chatgptId}" 
          style="width:100%;height:100vh;border:0;">
        </iframe>
      </body>
    </html>
  `);
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log("MAGICBANK BACKEND ACTIVO EN PUERTO", PORT);
});
