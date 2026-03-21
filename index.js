import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import crypto from "crypto";
import pkg from "pg";
import cors from "cors";
import rateLimit from "express-rate-limit";

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL;
function adminAuth(req,res,next){
  if(req.headers["x-admin-key"] !== process.env.ADMIN_KEY){
    return res.status(403).send("Forbidden");
  }
  next();
}
const CATALOGO = {

310587272:{area:"academy",nombre:"Inglés",url:"https://chatgpt.com/g/..."},
314000543:{area:"academy",nombre:"Español",url:"https://chatgpt.com/g/..."},
315067943:{area:"academy",nombre:"Italiano",url:"https://chatgpt.com/g/..."},
315067695:{area:"academy",nombre:"Portugués",url:"https://chatgpt.com/g/..."},
315067368:{area:"academy",nombre:"Chino",url:"https://chatgpt.com/g/..."},
315067066:{area:"academy",nombre:"Alemán",url:"https://chatgpt.com/g/..."},
310589317:{area:"academy",nombre:"Francés",url:"https://chatgpt.com/g/..."},
310596602:{area:"academy",nombre:"Cocina avanzada",url:"https://chatgpt.com/g/..."},
310593279:{area:"academy",nombre:"Nutrición inteligente",url:"https://chatgpt.com/g/..."},
310561138:{area:"academy",nombre:"ChatGPT avanzado",url:"https://chatgpt.com/g/..."},
307869983:{area:"academy",nombre:"Trading",url:"https://chatgpt.com/g/..."},
308837703:{area:"academy",nombre:"Banca digital",url:"https://chatgpt.com/g/..."},
314360954:{area:"academy",nombre:"Artes y oficios",url:"https://chatgpt.com/g/..."},
315058790:{area:"university",nombre:"Administración",url:"https://chatgpt.com/g/..."},
315061240:{area:"university",nombre:"Derecho",url:"https://chatgpt.com/g/..."},
315061516:{area:"university",nombre:"Contaduría",url:"https://chatgpt.com/g/..."},
315062968:{area:"university",nombre:"Software",url:"https://chatgpt.com/g/..."},
315062639:{area:"university",nombre:"Marketing",url:"https://chatgpt.com/g/..."},
316681661:{area:"tutor",nombre:"TAP Salud",url:"https://chatgpt.com/g/..."},
316682295:{area:"tutor",nombre:"TAP Derecho",url:"https://chatgpt.com/g/..."},
316763604:{area:"tutor",nombre:"TAP Empresas",url:"https://chatgpt.com/g/..."}
};
function normalize(text){
  return text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"");
}

function keywords(nombre,area){
  return [
    nombre,
    ...nombre.split(" "),
    area
  ].map(normalize);
}

const CATALOGO_PUBLICO = Object.values(CATALOGO).map(c=>({
  ...c,
  keywords: keywords(c.nombre,c.area),
  prioridad:10
}));
/* =========================================================
CATÁLOGO PÚBLICO — BUSCADOR INTELIGENTE
========================================================= */

function normalize(text){
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function buildKeywords(nombre, extra = []){
  const base = normalize(nombre).split(" ");
  return [...new Set([
    normalize(nombre),
    ...base,
    ...extra.map(normalize)
  ])];
}

const CATALOGO_PUBLICO = [

/* ================= IDIOMAS ================= */

{
  nombre:"Curso de Español",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-espanol-gj55x/",
  keywords:buildKeywords("español",["idioma","lengua","castellano"]),
  prioridad:10
},
{
  nombre:"Curso de Inglés",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-avanzado-de-ingles-con-magic-tutor-pro/",
  keywords:buildKeywords("ingles",["english","idioma"]),
  prioridad:10
},
{
  nombre:"Curso de Portugués",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-portugues/",
  keywords:buildKeywords("portugues",["idioma"]),
  prioridad:9
},
{
  nombre:"Curso de Chino",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-chino/",
  keywords:buildKeywords("chino",["mandarin","idioma"]),
  prioridad:9
},
{
  nombre:"Curso de Italiano",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-italiano/",
  keywords:buildKeywords("italiano",["idioma"]),
  prioridad:8
},
{
  nombre:"Curso de Francés",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-avanzado-de-frances-con-tutor-ia/",
  keywords:buildKeywords("frances",["idioma"]),
  prioridad:9
},
{
  nombre:"Curso de Alemán",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-aleman/",
  keywords:buildKeywords("aleman",["idioma"]),
  prioridad:9
},

/* ================= HABILIDADES ================= */

{
  nombre:"Curso de Cocina Avanzada",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-cocina-avanzado-con-tutor-con-ia/",
  keywords:buildKeywords("cocina",["chef","recetas"]),
  prioridad:9
},
{
  nombre:"Curso de Nutrición Inteligente",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/nutricion-inteligente-avanzada-con-tutor-ia/",
  keywords:buildKeywords("nutricion",["salud","alimentacion"]),
  prioridad:9
},
{
  nombre:"Curso Avanzado de ChatGPT",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-profesional-de-chatgpt/",
  keywords:buildKeywords("chatgpt",["ia","inteligencia artificial"]),
  prioridad:10
},
{
  nombre:"Curso de Trading Cíclico",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/trading-ciclico-social/",
  keywords:buildKeywords("trading",["inversion","mercado"]),
  prioridad:10
},
{
  nombre:"Curso de Banca Digital",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/magicbank-curso-de-banca-digital1/",
  keywords:buildKeywords("banca",["finanzas"]),
  prioridad:9
},

/* ================= TÉCNICOS ================= */

{
  nombre:"Artes y Oficios",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/artes-y-oficios-magicbank/",
  keywords:buildKeywords("oficios",["manualidades","trabajo"]),
  prioridad:10
},
{
  nombre:"Diseño de Interiores",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-diseno-de-interiores-profesional-gj1bk/",
  keywords:buildKeywords("diseño",["decoracion","hogar"]),
  prioridad:9
},

/* ================= TAP ================= */

{
  nombre:"TAP Salud",
  area:"tutor",
  url:"https://magicbank2.mitiendanube.com/productos/tap-salud/",
  keywords:buildKeywords("salud",["medicina"]),
  prioridad:10
},
{
  nombre:"TAP Derecho",
  area:"tutor",
  url:"https://magicbank2.mitiendanube.com/productos/tap-derecho/",
  keywords:buildKeywords("derecho",["abogado"]),
  prioridad:10
},
{
  nombre:"TAP Contaduría",
  area:"tutor",
  url:"https://magicbank2.mitiendanube.com/productos/asistente-profesional-para-contabilidad-b14t5/",
  keywords:buildKeywords("contabilidad",["finanzas"]),
  prioridad:10
},
{
  nombre:"TAP Empresas",
  area:"tutor",
  url:"https://magicbank2.mitiendanube.com/productos/tap-empresas/",
  keywords:buildKeywords("empresa",["negocio"]),
  prioridad:10
},
{
  nombre:"TAP Ingeniería",
  area:"tutor",
  url:"https://magicbank2.mitiendanube.com/productos/tap-ingenieros/",
  keywords:buildKeywords("ingenieria",["tecnico"]),
  prioridad:10
},
{
  nombre:"TAP Educación",
  area:"tutor",
  url:"https://magicbank2.mitiendanube.com/productos/tap-educacion/",
  keywords:buildKeywords("educacion",["docente"]),
  prioridad:10
},

/* ================= UNIVERSIDAD ================= */

{
  nombre:"Bachillerato MagicBank",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/magicbank-university1/",
  keywords:buildKeywords("bachillerato",["colegio"]),
  prioridad:10
},
{
  nombre:"Conservatorio Musical",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/facultad-de-musica-6k2ph/",
  keywords:buildKeywords("musica",["instrumentos"]),
  prioridad:10
},
{
  nombre:"Marketing",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/facultad-de-marketing/",
  keywords:buildKeywords("marketing",["ventas"]),
  prioridad:8
},
{
  nombre:"Contaduría",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/facultad-de-contaduria/",
  keywords:buildKeywords("contabilidad",["contador"]),
  prioridad:9
},
{
  nombre:"Derecho",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/curso-facultad-de-derecho/",
  keywords:buildKeywords("derecho",["leyes"]),
  prioridad:9
},
{
  nombre:"Software",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/facultad-de-desarrollo-de-software/",
  keywords:buildKeywords("programacion",["software"]),
  prioridad:9
},
{
  nombre:"Administración y Negocios",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/facultad-de-administracion-y-negocios/",
  keywords:buildKeywords("administracion",["negocios","empresa"]),
  prioridad:10
}

];
app.get("/api/catalogo-publico",(req,res)=>{
  res.json(CATALOGO_PUBLICO);
});

app.get("/api/catalogo-publico",(req,res)=>{
  res.json(CATALOGO_PUBLICO);
});
async function enviarCorreo(email,curso,token){

await axios.post("https://api.resend.com/emails",{
  from:"MagicBank <info@send.magicbank.org>",
  to:email,
  subject:`Acceso ${curso.nombre}`,
  html:`
  <h2>Acceso activado</h2>
  <a href="${BASE_URL}/access/${token}">
  ENTRAR
  </a>
  `
},{
  headers:{
    Authorization:`Bearer ${process.env.RESEND_API_KEY}`
  }
});

}
app.post("/webhooks/tiendanube/order-paid", async (req,res)=>{

res.sendStatus(200);

try{

const orderId = req.body.id;

const exists = await pool.query(
"SELECT 1 FROM processed_orders WHERE order_id=$1",
[orderId]
);

if(exists.rowCount) return;

const store = await pool.query(
"SELECT * FROM tiendanube_stores LIMIT 1"
);

const {store_id,access_token} = store.rows[0];

const order = await axios.get(
`https://api.tiendanube.com/v1/${store_id}/orders/${orderId}`,
{
headers:{
Authentication:`bearer ${access_token}`
}
});

if(order.data.payment_status !== "paid") return;

const email = order.data.contact_email;

const productId = order.data.order_products[0].product_id;

const curso = CATALOGO[productId];

if(!curso) return;

const rawToken = crypto.randomBytes(32).toString("hex");

const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

await pool.query(`
INSERT INTO access_tokens
(token,email,product_name,area,redirect_url,expires_at)
VALUES ($1,$2,$3,$4,$5,NOW()+interval '30 days')
`,[
hash,
email.toLowerCase(),
curso.nombre,
curso.area,
curso.url
]);

await enviarCorreo(email,curso,rawToken);

}catch(e){
console.error(e);
}

});
app.get("/access/:token", async (req,res)=>{

const hash = crypto
.createHash("sha256")
.update(req.params.token)
.digest("hex");

const r = await pool.query(`
SELECT redirect_url
FROM access_tokens
WHERE token=$1 AND expires_at > NOW()
`,[hash]);

if(!r.rowCount){
return res.status(403).send("Token inválido");
}

res.redirect(r.rows[0].redirect_url);

});
app.post("/api/validate-token", async (req,res)=>{

const token = req.body.token;
const email = req.body.email.toLowerCase();

const hash = crypto.createHash("sha256").update(token).digest("hex");

const r = await pool.query(`
SELECT email,product_name,area
FROM access_tokens
WHERE token=$1 AND email=$2 AND expires_at > NOW()
`,[hash,email]);

if(!r.rowCount){
return res.json({valid:false});
}

res.json({
valid:true,
...r.rows[0]
});

});
app.post("/activate-student", async (req,res)=>{

const {token} = req.body;

const hash = crypto.createHash("sha256").update(token).digest("hex");

const r = await pool.query(`
SELECT email,product_name
FROM access_tokens
WHERE token=$1
`,[hash]);

if(!r.rowCount){
return res.status(403).json({error:"invalid"});
}

let student = await pool.query(
"SELECT id FROM students WHERE email=$1",
[r.rows[0].email]
);

let id;

if(!student.rowCount){

const created = await pool.query(`
INSERT INTO students (email,academic_status)
VALUES ($1,'active') RETURNING id
`,[r.rows[0].email]);

id = created.rows[0].id;

}else{
id = student.rows[0].id;
}

res.json({
status:"ok",
student_id:id
});

});
app.get("/analytics", adminAuth, async (req,res)=>{

const r = await pool.query(`
SELECT product_name,COUNT(*) total
FROM access_tokens
GROUP BY product_name
ORDER BY total DESC
`);

res.json(r.rows);

});
app.listen(PORT,()=>{
console.log("🔥 MAGICBANK FULL SYSTEM RUNNING");
});
