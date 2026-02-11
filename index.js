import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import crypto from "crypto";
import nodemailer from "nodemailer";
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

    console.log("STORE TOKEN OK:", user_id);
    res.send("Aplicación instalada correctamente");
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.status(500).send("OAuth error");
  }
});

/* =========================
   CATÁLOGO CONGELADO
========================= */
const CATALOGO = {

315067943:{variant:1395732685,nombre:"Italiano",url:"https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb"},
315067695:{variant:1395731561,nombre:"Portugués",url:"https://chatgpt.com/g/g-694ff45ee8a88191b72cd536885b0876-tutor-de-portugues-mb"},
315067368:{variant:1395730081,nombre:"Chino",url:"https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin"},
315067066:{variant:1395728497,nombre:"Alemán",url:"https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-tutor-de-aleman-mb"},
310587272:{variant:1378551257,nombre:"Inglés",url:"https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622"},
310589317:{variant:1378561580,nombre:"Francés",url:"https://chatgpt.com/g/g-692af8c0b460819197c6c780bb96aaed-french-tutor-tutor-de-frances"},

314360954:{variant:1392376185,nombre:"Artes y oficios",url:"https://chatgpt.com/g/g-69482335eefc81918355d1df644de6d0-artesyoficios-tutor-pro"},
307869983:{variant:1368270221,nombre:"Trading cíclico",url:"https://chatgpt.com/g/g-6936550a35bc81919aa54bae25f5e133-trading-ciclico-tutor-magic-pro"},
308837703:{variant:1371792802,nombre:"Banca digital",url:"https://chatgpt.com/g/g-68f5676553c48191b9134e9f3f874efa-tutor-inversiones-magicas-tutor-magic-invesments"},
308900626:{variant:1372153030,nombre:"Pensiones mágicas",url:"https://chatgpt.com/g/g-6927e4527ac881919cf2697da6dd674b-tutor-oficial-de-pensiones-magicas-magicbank"},
310596602:{variant:1378595247,nombre:"Cocina avanzada",url:"https://chatgpt.com/g/g-6925b1e4cff88191a3e46165e9ab7824-elchef"},
310593279:{variant:1378580741,nombre:"Nutrición inteligente",url:"https://chatgpt.com/g/g-6927446749dc8191913af12801371ec9-tutor-experto-en-nutricion-inteligente"},
310561138:{variant:1378405952,nombre:"Curso avanzado ChatGPT",url:"https://chatgpt.com/g/g-6925338f45d88191b5c5c2b3080e553a-tutor-especializado"},
310399419:{variant:1377781307,nombre:"Cursos avanzados MagicBank",url:"https://chatgpt.com/g/g-69547fda3efc81918ba83ac2b0ec7af7-sensei-magic-tutor-pro"},

316685729:{variant:1404624823,nombre:"MagicBank Council",url:"https://chatgpt.com/g/g-693b0820918c819199d3922ac8bfd57f-magicbank-council"},

315061240:{variant:1395710455,nombre:"Facultad Derecho",url:"https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786-abogadus-magic-tutor-pro"},
315061516:{variant:1395711401,nombre:"Facultad Contaduría",url:"https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f-supercontador-magic-tutor-pro"},
315058790:{variant:1395698767,nombre:"Administración y negocios",url:"https://chatgpt.com/g/g-6934d1a2900c8191ab3aafa382225a65-superadministrador-magic-tutor-pro"},
315062968:{variant:1395720099,nombre:"Desarrollo software",url:"https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e-super-desarrollador-magic-tutor-pro"},
315062639:{variant:1395718843,nombre:"Marketing",url:"https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64-supermarketer-magic-tutor-pro"},

316681661:{variant:1404599981,nombre:"TAP Salud",url:"https://chatgpt.com/g/g-69593c44a6c08191accf43d956372325-tap-salud"},
316683199:{variant:1404612037,nombre:"TAP Educación",url:"https://chatgpt.com/g/g-6959471996e4819193965239320a5daa-tap-educacion"},
316683598:{variant:1404615645,nombre:"TAP Administración",url:"https://chatgpt.com/g/g-69594ab53b288191bd9ab50247e1a05c-tap-administracion-publica"},
316682295:{variant:1404604729,nombre:"TAP Derecho",url:"https://chatgpt.com/g/g-695946138ec88191a7d55a83d238a968-tap-abogados"},
316682789:{variant:1404608913,nombre:"TAP Ingeniería",url:"https://chatgpt.com/g/g-695949c461208191b087fe103d72c0ce-tap-ingenieria"},
316763604:{variant:1405073311,nombre:"TAP Empresas",url:"https://chatgpt.com/g/g-695947d7fe30819181bc53041e0c96d2-tap-empresas"}

};

/* =========================
   WEBHOOK
========================= */
app.post("/webhooks/tiendanube/order-paid", async (req, res) => {
  console.log("WEBHOOK:", JSON.stringify(req.body,null,2));
  res.sendStatus(200);

  try {
    const orderId=req.body.id;
    if(!orderId) return;

    const store=await pool.query("SELECT store_id,access_token FROM tiendanube_stores LIMIT 1");
    if(!store.rowCount) return;

    const {store_id,access_token}=store.rows[0];

    const order=await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/orders/${orderId}`,
      {headers:{Authentication:`bearer ${access_token}`,"User-Agent":"MagicBank","Content-Type":"application/json"}}
    );

    if(order.data.payment_status!=="paid") return;

    const email=
      order.data.contact_email ||
      order.data.customer?.email ||
      order.data.billing_address?.email;

    const productId=
      order.data.order_products?.[0]?.product_id ||
      order.data.products?.[0]?.product_id;

    const variantId=
      order.data.order_products?.[0]?.variant_id ||
      order.data.products?.[0]?.variant_id;

    let curso=CATALOGO[productId];

    if(!curso){
      for(const id in CATALOGO){
        if(CATALOGO[id].variant==variantId){
          curso=CATALOGO[id];
          break;
        }
      }
    }

    if(!curso){
      console.log("NO EN CATALOGO:",productId,variantId);
      return;
    }

    const token=crypto.randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO access_tokens
      (token,email,product_id,product_name,area,redirect_url,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW()+interval '30 days')`,
      [token,email,productId,curso.nombre,"magicbank",curso.url]
    );

    await transporter.sendMail({
      from:`"MagicBank"<${process.env.SMTP_USER}>`,
      to:email,
      subject:"Acceso a tu curso MagicBank",
      html:`<h2>${curso.nombre}</h2>
      <a href="https://magic-bank-backend-production-713e.up.railway.app/access/${token}">
      ACCEDER AL CURSO</a>`
    });

    console.log("EMAIL ENVIADO:",email);

  } catch(err){
    console.error("ERROR:",err.response?.data||err.message);
  }
});

/* =========================
   ACCESS TOKEN
========================= */
app.get("/access/:token", async (req,res)=>{
  const r=await pool.query(
    "SELECT redirect_url FROM access_tokens WHERE token=$1 AND expires_at>NOW()",
    [req.params.token]
  );
  if(!r.rowCount) return res.status(403).send("Acceso inválido");
  res.redirect(r.rows[0].redirect_url);
});

/* =========================
   START
========================= */
app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log("MAGICBANK BACKEND ACTIVO EN PUERTO", process.env.PORT);
});
