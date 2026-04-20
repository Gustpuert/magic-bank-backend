/* =========================================================
01 - CONFIGURACIÓN GLOBAL DEL SISTEMA
Carga variables de entorno y dependencias principales
========================================================= */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import crypto from "crypto";
import pkg from "pg";
import cors from "cors";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";

import OpenAI from "openai";

const { Pool } = pkg;

const app = express();

/* =========================================================
02 - MIDDLEWARE DEL SERVIDOR
Configuración base Express
========================================================= */

app.use(cors());
app.use(express.json());

/* =========================================================
03 - CONEXIÓN BASE DE DATOS
PostgreSQL Railway
Pool optimizado para alto tráfico
========================================================= */

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false },
max: 20,
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 2000
});

/* =========================================================
04 - HEALTHCHECK DEL BACKEND
Permite verificar si el servidor está activo
========================================================= */

app.get("/", (_, res) => {
res.send("MAGICBANK BACKEND ACTIVO");
});

/* =========================================================
05 - ANALYTICS DEL SISTEMA
Estadísticas operativas de la plataforma
========================================================= */

app.get("/analytics", async (req, res) => {
try {

const totalAlumnos = await pool.query(`
  SELECT COUNT(*) FROM access_tokens
`);

const cursosTop = await pool.query(`
  SELECT product_name, COUNT(*) as total
  FROM access_tokens
  GROUP BY product_name
  ORDER BY total DESC
`);

const areasTop = await pool.query(`
  SELECT area, COUNT(*) as total
  FROM access_tokens
  GROUP BY area
  ORDER BY total DESC
`);

const ventasPorDia = await pool.query(`
  SELECT DATE(created_at) as fecha, COUNT(*) as total
  FROM access_tokens
  GROUP BY DATE(created_at)
  ORDER BY fecha DESC
`);

res.json({
  total_alumnos: Number(totalAlumnos.rows[0].count),
  cursos_top: cursosTop.rows,
  areas_top: areasTop.rows,
  ventas_por_dia: ventasPorDia.rows
});

} catch (err) {
console.error("ERROR ANALYTICS:", err.message);
res.status(500).send("Error analytics");
}
});

/* =========================================================
06 - DASHBOARD VISUAL
Panel básico para monitoreo rápido
========================================================= */

app.get("/dashboard", async (req, res) => {
try {

const totalAlumnos = await pool.query(`
  SELECT COUNT(*) FROM access_tokens
`);

const cursosTop = await pool.query(`
  SELECT product_name, COUNT(*) as total
  FROM access_tokens
  GROUP BY product_name
  ORDER BY total DESC
`);

const areasTop = await pool.query(`
  SELECT area, COUNT(*) as total
  FROM access_tokens
  GROUP BY area
  ORDER BY total DESC
`);

const ventasPorDia = await pool.query(`
  SELECT DATE(created_at) as fecha, COUNT(*) as total
  FROM access_tokens
  GROUP BY DATE(created_at)
  ORDER BY fecha DESC
`);
const alerts = await pool.query(`
  SELECT email, product_name
  FROM student_feedback
  LIMIT 20
`);

const optimization = await pool.query(`
  SELECT product_name, AVG(rating) as rating
  FROM student_feedback
  GROUP BY product_name
`);
res.send(`
<html>
<head>
<title>MagicBank System</title>
</head>

<body style="font-family:Arial">

<h1>📊 MagicBank Control Panel</h1>

<h2>Usuarios en riesgo</h2>
<pre>${JSON.stringify(alerts.rows, null, 2)}</pre>

<h2>Optimización</h2>
<pre>${JSON.stringify(optimization.rows, null, 2)}</pre>

</body>
</html>
`);

} catch (error) {
console.error(error);
res.status(500).send("Error cargando dashboard");
}
});

/* =========================================================
DASHBOARD PRO — VISIÓN COMPLETA DEL SISTEMA
========================================================= */

app.get("/dashboard-pro", async (req, res) => {

  try {

    /* =========================================================
    1. QUERY SEGURA (NO CRASHEA)
    ========================================================= */

    const result = await pool.query(`

      SELECT
        f.product_name,

        COUNT(*) as total_feedbacks,

        ROUND(AVG(f.rating),2) as avg_rating,

        COUNT(*) FILTER (WHERE f.category = 'clarity') as clarity_issues,
        COUNT(*) FILTER (WHERE f.category = 'speed') as speed_issues,
        COUNT(*) FILTER (WHERE f.category = 'interaction') as interaction_issues,
        COUNT(*) FILTER (WHERE f.category = 'difficulty') as difficulty_issues,

        COALESCE(d.abandonment_rate, 0) as abandonment_rate

      FROM student_feedback f

      LEFT JOIN (
        SELECT
          product_name,
          ROUND(
            COUNT(*) FILTER (
              WHERE last_access < NOW() - INTERVAL '3 days'
            ) * 100.0 / NULLIF(COUNT(*),0)
          ,2) as abandonment_rate
        FROM access_tokens
        GROUP BY product_name
      ) d

      ON d.product_name = f.product_name

      GROUP BY f.product_name, d.abandonment_rate

      ORDER BY avg_rating DESC NULLS LAST

    `);

    /* =========================================================
    2. PROCESAMIENTO INTELIGENTE (ANTI-CRASH)
    ========================================================= */

    const rows = result.rows.map(r => {

      const total = Number(r.total_feedbacks || 0);
      const rating = Number(r.avg_rating || 0);
      const abandonment = Number(r.abandonment_rate || 0);

      const clarity = Number(r.clarity_issues || 0);
      const speed = Number(r.speed_issues || 0);
      const interaction = Number(r.interaction_issues || 0);
      const difficulty = Number(r.difficulty_issues || 0);

      /* ===============================
      SCORE GLOBAL
      =============================== */

      let score = 100;

      score -= abandonment * 0.6;
      score -= (5 - rating) * 10;

      /* ===============================
      DETECCIÓN DE FRICCIÓN
      =============================== */

      let friction = "none";

      if (abandonment > 50 && rating > 4) {
        friction = "entry_barrier";
      } else if (clarity > total * 0.3) {
        friction = "confusion";
      } else if (speed > total * 0.3) {
        friction = "pacing_problem";
      } else if (interaction > total * 0.4) {
        friction = "too_many_questions";
      } else if (difficulty > total * 0.3) {
        friction = "too_hard";
      }

      /* ===============================
      ESTADO
      =============================== */

      let status = "ok";

      if (score < 60) status = "risk";
      if (score < 40) status = "critical";

      /* ===============================
      ACCIÓN AUTOMÁTICA
      =============================== */

      let action = "Mantener";

      if (friction === "entry_barrier") {
        action = "Simplificar onboarding";
      }

      if (friction === "confusion") {
        action = "Mejorar claridad del tutor";
      }

      if (friction === "pacing_problem") {
        action = "Reducir velocidad";
      }

      if (friction === "too_many_questions") {
        action = "Reducir preguntas";
      }

      if (friction === "too_hard") {
        action = "Bajar dificultad";
      }

      return {
        ...r,
        score: Math.round(score),
        status,
        action,
        friction
      };

    });

    /* =========================================================
    3. HTML DASHBOARD (ULTRA LIGERO)
    ========================================================= */

    const htmlRows = rows.map(r => `

      <tr>
        <td>${r.product_name}</td>
        <td>${r.score}</td>
        <td>${r.avg_rating || 0}</td>
        <td>${r.abandonment_rate || 0}%</td>
        <td>${r.status}</td>
        <td>${r.friction}</td>
        <td>${r.action}</td>
      </tr>

    `).join("");

    res.send(`

      <html>
      <head>
        <title>MagicBank Intelligence</title>

        <style>
          body {
            font-family: Arial;
            background: #0f172a;
            color: white;
            padding: 30px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            padding: 12px;
            border-bottom: 1px solid #333;
            text-align: left;
          }

          th {
            color: #38bdf8;
          }

          tr:hover {
            background: #1e293b;
          }
        </style>
      </head>

      <body>

        <h1>🧠 MagicBank Intelligence Dashboard</h1>

        <table>
          <thead>
            <tr>
              <th>Curso</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Abandono</th>
              <th>Estado</th>
              <th>Fricción</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            ${htmlRows}
          </tbody>
        </table>

      </body>
      </html>

    `);

  } catch (error) {

    console.error("DASHBOARD PRO ERROR:", error);

    res.status(500).send("Error cargando dashboard");

  }

});
        

app.get("/dashboard/pro/view", async (req, res) => {

  res.send(`
  <html>
  <head>
    <title>MagicBank Intelligence Dashboard</title>

    <style>
      body {
        font-family: Arial, sans-serif;
        background: #0f172a;
        color: white;
        padding: 20px;
      }

      h1 {
        color: #38bdf8;
        margin-bottom: 20px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        background: #111827;
      }

      th, td {
        padding: 12px;
        border-bottom: 1px solid #1e293b;
        text-align: left;
      }

      th {
        color: #38bdf8;
        background: #1e293b;
      }

      tr:hover {
        background: #1e293b;
      }

      .critical {
        color: #ff4d4d;
        font-weight: bold;
      }

      .risk {
        color: #ffaa00;
        font-weight: bold;
      }

      .ok {
        color: #00ff88;
        font-weight: bold;
      }

      .score {
        font-weight: bold;
      }

      .loading {
        color: #94a3b8;
        margin-top: 10px;
      }
    </style>
  </head>

  <body>

    <h1>🧠 MagicBank Intelligence Dashboard</h1>

    <div class="loading" id="status">Cargando datos...</div>

    <table>
      <thead>
        <tr>
          <th>Curso</th>
          <th>Score</th>
          <th>Rating</th>
          <th>Abandono</th>
          <th>Estado</th>
          <th>Fricción</th>
          <th>Acción</th>
        </tr>
      </thead>

      <tbody id="table"></tbody>
    </table>

    <script>
      async function load() {

        try {

          // ⚠️ Endpoint correcto
          const response = await fetch('/dashboard-pro');

          // dashboard-pro actualmente devuelve HTML, no JSON
          // así que lo corregimos usando un endpoint JSON alterno
          const data = await response.json();

          const tbody = document.getElementById("table");
          const status = document.getElementById("status");

          tbody.innerHTML = "";

          // Compatibilidad por si devuelves rows o dashboard
          const rows = data.dashboard || data.rows || [];

          rows.forEach(row => {

            const tr = document.createElement("tr");

            tr.innerHTML = \`
              <td>\${row.product_name || "-"}</td>
              <td class="score">\${row.score || row.health_score || 0}</td>
              <td>\${row.avg_rating || 0}</td>
              <td>\${row.abandonment_rate || 0}%</td>
              <td class="\${row.status || 'ok'}">\${row.status || 'ok'}</td>
              <td>\${row.friction || row.root_cause || "-"}</td>
              <td>\${row.action || "-"}</td>
            \`;

            tbody.appendChild(tr);

          });

          status.innerText = "Actualizado correctamente";

        } catch (err) {

          console.error("DASHBOARD VIEW ERROR:", err);

          document.getElementById("status").innerText =
            "No se pudo cargar el dashboard.";

        }
      }

      load();
      setInterval(load, 5000);
    </script>

  </body>
  </html>
  `);

});


/* =========================================================
07 - AUTENTICACIÓN TIENDANUBE (OAUTH)
Conecta la tienda con MagicBank
========================================================= */

app.get("/auth/tiendanube", (req, res) => {

const redirectUri =
"https://magic-bank-backend-production-713e.up.railway.app/auth/tiendanube/callback";

const url =
"https://www.tiendanube.com/apps/24551/authorize" +
"?response_type=code" +
`&redirect_uri=${encodeURIComponent(redirectUri)}` +
"&scope=read_orders,write_webhooks";

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
"https://magic-bank-backend-production-713e.up.railway.app/auth/tiendanube/callback"
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
/* =========================================================
08 - CATÁLOGO CONGELADO HISTÓRICO
PRODUCT_ID + VARIANT_ID
========================================================= */

const CATALOGO = {

315067943:{variant:1395732685,area:"academy",nombre:"Italiano",url:"https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb"},
315067695:{variant:1395731561,area:"academy",nombre:"Portugués",url:"https://chatgpt.com/g/g-694ff45ee8a88191b72cd536885b0876-tutor-de-portugues-mb"},
315067368:{variant:1395730081,area:"academy",nombre:"Chino",url:"https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin"},
315067066:{variant:1395728497,area:"academy",nombre:"Alemán",url:"https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-tutor-de-aleman-mb"},
310587272:{variant:1378551257,area:"academy",nombre:"Inglés",url:"https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622"},
310589317:{variant:1378561580,area:"academy",nombre:"Francés",url:"https://chatgpt.com/g/g-692af8c0b460819197c6c780bb96aaed"},

314360954:{variant:1392376185,area:"academy",nombre:"Artes y oficios",url:"https://chatgpt.com/g/g-69482335eefc81918355d1df644de6d0-artesyoficios-tutor-pro"},
307869983:{variant:1368270221,area:"academy",nombre:"Trading cíclico",url:"https://chatgpt.com/g/g-6936550a35bc81919aa54bae25f5e133"},
308837703:{variant:1371792802,area:"academy",nombre:"Banca digital",url:"https://chatgpt.com/g/g-68f5676553c48191b9134e9f3f874efa"},
308900626:{variant:1372153030,area:"academy",nombre:"Pensiones mágicas",url:"https://chatgpt.com/g/g-6927e4527ac881919cf2697da6dd674b"},
310596602:{variant:1378595247,area:"academy",nombre:"Cocina avanzada",url:"https://chatgpt.com/g/g-6925b1e4cff88191a3e46165e9ab7824"},
310593279:{variant:1378580741,area:"academy",nombre:"Nutrición inteligente",url:"https://chatgpt.com/g/g-6927446749dc8191913af12801371ec9"},
310561138:{variant:1378405952,area:"academy",nombre:"Curso avanzado ChatGPT",url:"https://chatgpt.com/g/g-6925338f45d88191b5c5c2b3080e553a"},
310399419:{variant:1377781307,area:"academy",nombre:"Cursos avanzados MagicBank",url:"https://chatgpt.com/g/g-69547fda3efc81918ba83ac2b0ec7af7"},

316685729:{variant:1404624823,area:"academy",nombre:"MagicBank Council",url:"https://chatgpt.com/g/g-693b0820918c819199d3922ac8bfd57f"},

315061240:{variant:1395710455,area:"university",nombre:"Facultad Derecho",url:"https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786"},
315061516:{variant:1395711401,area:"university",nombre:"Facultad Contaduría",url:"https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f"},
315058790:{variant:1395698767,area:"university",nombre:"Administración y negocios",url:"https://chatgpt.com/g/g-6934d1a2900c8191ab3aafa382225a65"},
315062968:{variant:1395720099,area:"university",nombre:"Desarrollo software",url:"https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e"},
315062639:{variant:1395718843,area:"university",nombre:"Marketing",url:"https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64"},

316681661:{variant:1404599981,area:"tutor",nombre:"TAP Salud",url:"https://chatgpt.com/g/g-69593c44a6c08191accf43d956372325"},
316683199:{variant:1404612037,area:"tutor",nombre:"TAP Educación",url:"https://chatgpt.com/g/g-6959471996e4819193965239320a5daa"},
316683598:{variant:1404615645,area:"tutor",nombre:"TAP Administración",url:"https://chatgpt.com/g/g-69594ab53b288191bd9ab50247e1a05c"},
316682295:{variant:1404604729,area:"tutor",nombre:"TAP Derecho",url:"https://chatgpt.com/g/g-695946138ec88191a7d55a83d238a968"},
316682789:{variant:1404608913,area:"tutor",nombre:"TAP Ingeniería",url:"https://chatgpt.com/g/g-695949c461208191b087fe103d72c0ce"},
316763604:{variant:1405073311,area:"tutor",nombre:"TAP Empresas",url:"https://chatgpt.com/g/g-695947d7fe30819181bc53041e0c96d2"},

328032405:{
variant:1458984295,
area:"university",
nombre:"Bachillerato completo MagicBank",
url:"https://chatgpt.com/g/g-699e59962d20819194b173b12f4857ed-bachillerato-director-academivo-tutor-pro"
},
  331400543:{
variant:null,
area:"academy",
nombre:"Tutor de Español",
url:"https://chatgpt.com/g/g-69b43351db6081919e0dcfb02e5fb003-tutor-de-espanol"
},

331389115:{
variant:null,
area:"academy",
nombre:"Tutor de Diseño de Interiores",
url:"https://chatgpt.com/g/g-69b406bccf808191b16ff30d805f3255-tutor-de-diseno-de-interiores"
},

331390008:{
variant:null,
area:"conservatorio",
nombre:"Conservatorio MagicBank - Director Musical",
url:"https://chatgpt.com/g/g-69b0f60650e88191bfdb5508f1b17254-director-musical-magicbank"
},

324464294:{
variant:1438540878,
area:"tutor",
nombre:"TAP Contaduría",
url:"https://chatgpt.com/g/g-69684f74a91c8191850a3f43493f2c78-tap-de-contaduria-accounting-pat"
},
  
317323052:{
  variant:null,
  area:"tutor",
  nombre:"Super Yo",
  url:"https://chatgpt.com/g/g-69610a47b1cc8191bda50cf5c0dea773-super-yo-tutor-pro"
},

335874975:{
  variant:null,
  area:"tutor",
  nombre:"Cristo Tutor Pro",
  url:"https://chatgpt.com/g/g-695e8993d4ac8191a153940adbde48d4-cristotutor-pro"
},

317258375:{
  variant:null,
  area:"tutor",
  nombre:"Sensei Tutor Pro",
  url:"https://chatgpt.com/g/g-69547fda3efc81918ba83ac2b0ec7af7-sensei-magic-tutor-pro"
},

316685090:{
  variant:null,
  area:"tutor",
  nombre:"Bienestar Tutor Pro",
  url:"https://chatgpt.com/g/g-693e3bb199b881919ad636fff9084249-bienestartutor-pro"
},

316684646:{
  variant:null,
  area:"tutor",
  nombre:"Super Traductor",
  url:"https://chatgpt.com/g/g-6936d30471708191b9ac5f00163d8605-supertraductor-magic-tutor-pro"
},

316685729:{
  variant:null,
  area:"tutor",
  nombre:"MagicBank Council",
  url:"https://chatgpt.com/g/g-693b0820918c819199d3922ac8bfd57f-magicbank-council"
}
};






/* =========================================================
CATÁLOGO BUSCADOR (FUENTE: TIENDANUBE)
Optimizado para búsqueda inteligente
========================================================= */

function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buildKeywords(nombre, extra = []) {
  const base = normalize(nombre).split(" ");

  return [
    normalize(nombre),
    ...base,
    ...extra.map(normalize)
  ];
}

const SEARCH_CATALOG = [

/* ===== IDIOMAS ===== */

{
  nombre:"Español",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-espanol-gj55x/",
  keywords:buildKeywords("español",["idioma","lengua","curso"]),
  prioridad:10
},
{
  nombre:"Inglés",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-avanzado-de-ingles-con-magic-tutor-pro/",
  keywords:buildKeywords("ingles",["english","idioma"]),
  prioridad:10
},
{
  nombre:"Portugués",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-portugues/",
  keywords:buildKeywords("portugues",["idioma"]),
  prioridad:8
},
{
  nombre:"Chino",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-chino/",
  keywords:buildKeywords("chino",["mandarin"]),
  prioridad:8
},
{
  nombre:"Italiano",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-italiano/",
  keywords:buildKeywords("italiano"),
  prioridad:7
},
{
  nombre:"Francés",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-avanzado-de-frances-con-tutor-ia/",
  keywords:buildKeywords("frances",["idioma"]),
  prioridad:9
},
{
  nombre:"Alemán",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-aleman/",
  keywords:buildKeywords("aleman",["idioma"]),
  prioridad:9
},

/* ===== CURSOS ===== */

{
  nombre:"Cocina avanzada",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-de-cocina-avanzado-advance-cooking-course/",
  keywords:buildKeywords("cocina",["chef","recetas"]),
  prioridad:9
},
{
  nombre:"Nutrición inteligente",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/nutricion-inteligente-avanzada-con-tutor-ia/",
  keywords:buildKeywords("nutricion",["salud"]),
  prioridad:9
},
{
  nombre:"ChatGPT avanzado",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-profesional-de-chatgpt/",
  keywords:buildKeywords("chatgpt",["ia","inteligencia artificial"]),
  prioridad:10
},
{
  nombre:"Trading cíclico",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/trading-ciclico-social/",
  keywords:buildKeywords("trading",["inversion"]),
  prioridad:10
},
{
  nombre:"Artes y oficios",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/artes-y-oficios-magicbank/",
  keywords:buildKeywords("oficios",["manualidades","trabajo"]),
  prioridad:10
},
{
  nombre:"Diseño de interiores",
  area:"academy",
  url:"https://magicbank2.mitiendanube.com/productos/curso-diseno-de-interiores-profesional-gj1bk/",
  keywords:buildKeywords("diseño",["decoracion","hogar"]),
  prioridad:9
},

/* ===== UNIVERSITY ===== */

{
  nombre:"Facultad Derecho",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/curso-facultad-de-derecho/",
  keywords:buildKeywords("derecho",["leyes"]),
  prioridad:10
},
{
  nombre:"Administración y negocios",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/facultad-de-administracion-y-negocios/",
  keywords:buildKeywords("empresa",["negocios"]),
  prioridad:10
},
{
  nombre:"Marketing",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/facultad-de-marketing/",
  keywords:buildKeywords("marketing",["ventas"]),
  prioridad:10
},
{
  nombre:"Contaduría",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/facultad-de-contaduria/",
  keywords:buildKeywords("contabilidad",["finanzas"]),
  prioridad:10
},
{
  nombre:"Desarrollo de software",
  area:"university",
  url:"https://magicbank2.mitiendanube.com/productos/facultad-de-desarrollo-de-software/",
  keywords:buildKeywords("programacion",["software"]),
  prioridad:10
},

/* ===== TUTORES ESPECIALES (CORRECTO) ===== */

{
  product_id:317323052,
  nombre:"Super Yo",
  area:"tutores",
  url:"https://chatgpt.com/g/g-69610a47b1cc8191bda50cf5c0dea773-super-yo-tutor-pro",
  keywords:buildKeywords("super yo",["asistente","emociones"]),
  prioridad:10
},
{
  product_id:335874975,
  nombre:"Cristo Tutor Pro",
  area:"tutores",
  url:"https://chatgpt.com/g/g-695e8993d4ac8191a153940adbde48d4-cristotutor-pro",
  keywords:buildKeywords("cristo biblia fe"),
  prioridad:10
},
{
  product_id:317258375,
  nombre:"Sensei Tutor Pro",
  area:"tutores",
  url:"https://chatgpt.com/g/g-69547fda3efc81918ba83ac2b0ec7af7-sensei-magic-tutor-pro",
  keywords:buildKeywords("sensei reuniones"),
  prioridad:10
},
{
  product_id:316685090,
  nombre:"Bienestar Tutor Pro",
  area:"tutores",
  url:"https://chatgpt.com/g/g-693e3bb199b881919ad636fff9084249-bienestartutor-pro",
  keywords:buildKeywords("bienestar ansiedad"),
  prioridad:10
},
{
  product_id:316684646,
  nombre:"Super Traductor",
  area:"tutores",
  url:"https://chatgpt.com/g/g-6936d30471708191b9ac5f00163d8605-supertraductor-magic-tutor-pro",
  keywords:buildKeywords("traductor idiomas"),
  prioridad:10
},
{
  product_id:316685729,
  nombre:"MagicBank Council",
  area:"tutores",
  url:"https://chatgpt.com/g/g-693b0820918c819199d3922ac8bfd57f-magicbank-council",
  keywords:buildKeywords("negocio estrategia"),
  prioridad:10
}

];

/* =========================================================
ENDPOINT BUSCADOR INTELIGENTE (OPTIMIZADO PRO)
========================================================= */

app.get("/api/search", (req, res) => {
  try {

    const q = normalize(req.query.q || "");

    if (!q) {
      return res.json({ results: [] });
    }

    const results = SEARCH_CATALOG.map(item => {

      let score = 0;

      const nombre = normalize(item.nombre);

      // 🔥 MATCH EXACTO (TOP PRIORIDAD)
      if (nombre === q) {
        score += 30;
      }

      // 🔥 MATCH INICIO DE NOMBRE
      else if (nombre.startsWith(q)) {
        score += 20;
      }

      // 🔥 MATCH PARCIAL CONTROLADO
      else if (q.length > 4 && nombre.includes(q)) {
        score += 10;
      }

      // 🔥 KEYWORDS INTELIGENTES (MUCHO MÁS ESTRICTO)
      for (const kw of item.keywords) {

        if (kw === q) {
          score += 12;
        }
        else if (kw.startsWith(q)) {
          score += 6;
        }
        else if (q.length > 5 && kw.includes(q)) {
          score += 2;
        }

      }

      // 🔥 BOOST ÁREA
      if (item.area === "academy") {
        score += 3;
      }

      // 🔥 PRIORIDAD BASE
      score += item.prioridad || 0;

      return {
        ...item,
        score
      };

    })
    .filter(item => item.score >= 15) // 🔴 FILTRO CLAVE (ANTES ERA MUY BAJO)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

    res.json({
      query: q,
      results
    });

  } catch (error) {

    console.error("SEARCH ERROR:", error);

    res.status(500).json({
      error: "search error"
    });

  }
});

/* =========================================================
09 - SISTEMA DE CORREO (RESEND)
Envío automático de accesos académicos
========================================================= */

async function enviarCorreo(destino, curso, token) {
  try {

    await axios.post(
      "https://api.resend.com/emails",
      {
        from: "MagicBank <info@send.magicbank.org>",
        to: destino,
        subject: `🎓 Acceso oficial a ${curso.nombre}`,
        html: `
<div style="font-family:Arial, sans-serif; line-height:1.6;">

<h2>🎓 Activación Confirmada</h2>

<p>Hola,</p>

<p>Tu acceso a <strong>${curso.nombre}</strong> ha sido activado correctamente.</p>

<hr>

<h3>🔐 PRIMER INGRESO (OBLIGATORIO)</h3>

<p>1️⃣ Haz clic en el siguiente botón:</p>

<p>
<a href="https://magic-bank-backend-production-713e.up.railway.app/access-page/${token}"
style="background-color:#0a1f44;
color:#ffffff;
padding:12px 20px;
text-decoration:none;
border-radius:6px;
font-weight:bold;
display:inline-block;">
ACCEDER AL TUTOR
</a>
</p>

<p>2️⃣ Cuando se abra el tutor, pega inmediatamente el siguiente bloque en la parte inferior del chat:</p>

<pre style="background:#f4f4f4;
padding:15px;
border-radius:6px;
font-size:14px;
white-space:pre-wrap;">

Correo: ${destino}
Token: ${token}

</pre>

<p>3️⃣ Haz clic en la flecha de envío y sigue las instrucciones del Director Académico para iniciar la matrícula.</p>

<hr>

<h3>🔁 INGRESOS DURANTE 30 DÍAS</h3>

<p>Durante los próximos 30 días, simplemente haz clic en <strong>Acceder al Tutor</strong> y continúa tu proceso académico.</p>

<p>No necesitas volver a pegar el bloque mientras tu acceso esté vigente.</p>

<hr>

<h3>⏳ VIGENCIA</h3>

<p>Tu acceso es válido por 30 días.</p>

<p>Al finalizar el periodo, el sistema invalidará automáticamente el token y será necesario renovar la suscripción para generar uno nuevo.</p>

<hr>

<p style="font-size:12px; color:#555;">
Dirección Académica MagicBank<br>
Formación estructurada · Control institucional · Certificación con criterio
</p>

</div>
`
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("EMAIL ENVIADO OK");

  } catch (error) {
    console.error(
      "ERROR RESEND:",
      error.response?.data || error.message
    );
  }
}

/* =========================================================
10 - WEBHOOK TIENDANUBE
Procesa compras pagadas
========================================================= */

app.post("/webhooks/tiendanube/order-paid", async (req, res) => {

res.sendStatus(200);

try {

const orderId = req.body.id;

if (!orderId) {
console.warn("Webhook recibido sin orderId");
return;
}

/* 1 - verificar orden duplicada */

const existingOrder = await pool.query(
"SELECT 1 FROM processed_orders WHERE order_id = $1",
[orderId]
);

if (existingOrder.rowCount > 0) {
console.log("Orden ya procesada:", orderId);
return;
}

/* 2 - obtener credenciales tienda */

const store = await pool.query(
"SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
);

if (!store.rowCount) {
console.error("No hay tienda conectada");
return;
}

const { store_id, access_token } = store.rows[0];

/* 3 - consultar orden oficial */

const order = await axios.get(
`https://api.tiendanube.com/v1/${store_id}/orders/${orderId}`,
{
headers: {
Authentication: `bearer ${access_token}`,
"User-Agent": "MagicBank",
"Content-Type": "application/json"
}
}
);

/* 4 - validar pago */

if (order.data.payment_status !== "paid") {
console.log("Orden no pagada:", orderId);
return;
}

/* 5 - extraer email */

const email =
order.data.contact_email ||
order.data.customer?.email ||
order.data.billing_address?.email;

if (!email) {
console.warn("Orden sin email:", orderId);
return;
}

/* 6 - detectar producto */

const productId =
order.data.order_products?.[0]?.product_id ||
order.data.products?.[0]?.product_id;

const variantId =
order.data.order_products?.[0]?.variant_id ||
order.data.products?.[0]?.variant_id;

let curso = CATALOGO[productId];

if (!curso) {

for (const id in CATALOGO) {
if (CATALOGO[id].variant === variantId) {
curso = CATALOGO[id];
break;
}
}

}

if (!curso) {
console.warn("Producto no encontrado en catálogo:", productId);
return;
}

/* 7 - generar token */

const rawToken = crypto.randomBytes(32).toString("hex");

const tokenHash = crypto
.createHash("sha256")
.update(rawToken)
.digest("hex");

/* 8 - guardar token */

await pool.query(
`
INSERT INTO access_tokens
(token,email,product_id,product_name,area,redirect_url,expires_at)
VALUES ($1,$2,$3,$4,$5,$6,NOW() + interval '30 days')
`,
[
tokenHash,
email,
productId,
curso.nombre,
curso.area,
curso.url
]
);

/* 9 - registrar orden */

await pool.query(
`
INSERT INTO processed_orders (order_id, raw_order, created_at)
VALUES ($1,$2,NOW())
ON CONFLICT (order_id) DO NOTHING
`,
[orderId, JSON.stringify(order.data)]
);

/* 10 - enviar correo */

await enviarCorreo(email, curso, rawToken);

console.log("Webhook procesado:", orderId);

} catch (err) {

console.error(
"ERROR WEBHOOK:",
err.response?.data || err.message
);

}

});
/* =========================================================
11 - MAPA TUTORES BACHILLERATO
========================================================= */

const TUTOR_GPTS = {

matematicas:"https://chatgpt.com/g/g-699bcab04a3c81918adc1061209889af-bachiller-matematicas-tutor-pro",

"ciencias-naturales":"https://chatgpt.com/g/g-699e260ae5f08191ace18acfd628fd6b-bachillerato-tutor-de-ciencias-naturales",

lenguaje:"https://chatgpt.com/g/g-699e327b46848191af476ddc6ee9c091-bachillerato-tutor-lenguaje",

"ciencias-sociales":"https://chatgpt.com/g/g-699e331abc048191b5377e84353e159d-bachillerato-tutor-de-ciencias-sociales",

"etica-valores":"https://chatgpt.com/g/g-699e3504f2248191a39334f24854a0e5-bachillerato-tutor-de-etica-y-valores-humanos",

"tecnologia-informatica":"https://chatgpt.com/g/g-699e35c46f348191b350b97f4bf0a544-bachillerato-tutor-de-tecnologia-e-informatica",

"educacion-artistica":"https://chatgpt.com/g/g-699e36eae2bc81919dfe01a0b18c67f3-bachillerato-tutor-educacion-artistica-y-cultural",

"educacion-fisica":"https://chatgpt.com/g/g-699e37946b888191b14c5fe1572f55a3-bachillerato-tutor-de-educacion-fisica-y-deporte",

"educacion-religiosa":"https://chatgpt.com/g/g-699e382245b08191a9824537ddea9faf-bachillerato-tutor-de-educacion-religiosa",

ingles:"https://chatgpt.com/g/g-699e366421f08191b14fc6af17f251fd-bachillerato-tutor-de-ingles"

};

/* =========================================================
12 - SISTEMA DE ACCESO CON TOKEN (CONTROL USO)
========================================================= */

app.get("/access/:token", async (req, res) => {

try {

  const rawToken = req.params.token.replace(/\s+/g, "").trim();

const tokenHash = crypto
.createHash("sha256")
.update(rawToken)
.digest("hex");

const r = await pool.query(
`
SELECT redirect_url, token_uses, max_uses
FROM access_tokens
WHERE token = $1
AND expires_at > NOW()
`,
[tokenHash]
);

if (!r.rowCount) {
return res.status(403).send("Acceso inválido");
}

const tokenData = r.rows[0];
  console.log("uses:", tokenData.token_uses, "max:", tokenData.max_uses);

if (tokenData.token_uses >= tokenData.max_uses) {
return res.status(403).send("Token excedió número máximo de usos");
}

/* aumentar contador */

await pool.query(`
UPDATE access_tokens
SET token_uses = token_uses + 1
WHERE token = $1
`, [tokenHash]);

res.redirect(tokenData.redirect_url);

} catch (error) {

console.error(error);

res.status(500).send("Error validando acceso");

}

});



/* =========================================================
13 - ONBOARDING ACADÉMICO
Formulario inicial de inscripción
========================================================= */

app.get("/onboarding/:token", async (req, res) => {

try {

const rawToken = req.params.token;

const tokenHash = crypto
  .createHash("sha256")
  .update(rawToken)
  .digest("hex");

const r = await pool.query(
  `
  SELECT email
  FROM access_tokens
  WHERE token = $1
  AND expires_at > NOW()
  `,
  [tokenHash]
);

if (!r.rowCount) {
  return res.status(403).send("Token inválido");
}

res.send(`
  <html>
  <body style="font-family:Arial;background:#0f172a;color:white;padding:40px;">
    <h2>🎓 Inscripción Oficial Bachillerato MagicBank</h2>

    <form method="POST" action="/onboarding/${rawToken}">
      <label>Nombre completo:</label><br>
      <input name="full_name" required /><br><br>

      <label>Edad:</label><br>
      <input name="age" type="number" required /><br><br>

      <label>Grado declarado:</label><br>
      <input name="declared_grade" type="number" min="1" max="11" required /><br><br>

      <label>
        <input type="checkbox" name="legal_accept" required />
        Acepto las condiciones académicas y reglamento institucional
      </label><br><br>

      <button type="submit">Finalizar Inscripción</button>
    </form>
  </body>
  </html>
`);

} catch (error) {
console.error(error);
res.status(500).send("Error en onboarding");
}

});

/* =========================================================
14 - DIRECTOR SUBMIT INSTITUCIONAL
Registro académico controlado por el Director
========================================================= */

app.post("/academic/director-submit", async (req, res) => {

try {

const {
  token,
  full_name,
  age,
  declared_grade,
  validated_grade,
  country
} = req.body;

if (!token || !full_name || !declared_grade) {
  return res.status(400).json({ error: "Datos incompletos" });
}

const tokenHash = crypto
  .createHash("sha256")
  .update(token)
  .digest("hex");

const access = await pool.query(`
  SELECT email, product_name
  FROM access_tokens
  WHERE token = $1
  AND expires_at > NOW()
`, [tokenHash]);

if (!access.rowCount) {
  return res.status(403).json({ error: "Token inválido" });
}

const { email, product_name } = access.rows[0];

let student_id;

const existing = await pool.query(
  "SELECT id FROM students WHERE email = $1",
  [email]
);

if (!existing.rowCount) {

  const created = await pool.query(`
    INSERT INTO students
    (full_name, email, age, declared_grade, current_grade)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING id
  `, [
    full_name,
    email,
    age || null,
    declared_grade,
    validated_grade || declared_grade
  ]);

  student_id = created.rows[0].id;

} else {

  student_id = existing.rows[0].id;

  await pool.query(`
    UPDATE students
    SET
      full_name = $1,
      age = $2,
      declared_grade = $3,
      current_grade = $4
    WHERE id = $5
  `, [
    full_name,
    age || null,
    declared_grade,
    validated_grade || declared_grade,
    student_id
  ]);

}

res.json({
  message: "Proceso académico activado correctamente",
  student_id
});

} catch (error) {
console.error("ERROR DIRECTOR SUBMIT:", error);
res.status(500).json({
error: "Error procesando inscripción académica"
});
}

});

/* =========================================================
15 - INSCRIPCIÓN ACADÉMICA DEL ESTUDIANTE
========================================================= */

app.post("/student/enroll", async (req, res) => {
try {

const {
  student_id,
  declared_grade,
  enrollment_type
} = req.body;

await pool.query(`
  UPDATE students
  SET
    academic_status = 'active',
    declared_grade = $2,
    enrollment_type = $3,
    enrolled_at = NOW()
  WHERE id = $1
`,
[
  student_id,
  declared_grade,
  enrollment_type
]);

res.send("Alumno inscrito académicamente");

} catch (error) {
console.error(error);
res.status(500).send("Error inscribiendo alumno");
}
});

/* =========================================================
16 - REPORTE DE TUTORES
Comunicación Tutor → Base de datos
========================================================= */

app.post("/tutor/report", async (req, res) => {
try {

const {
  student_id,
  tutor_name,
  subject,
  report_type,
  summary,
  recommendation,
  priority_level
} = req.body;

await pool.query(`
  INSERT INTO tutor_reports
  (student_id, tutor_name, subject, report_type, summary, recommendation, priority_level)
  VALUES ($1,$2,$3,$4,$5,$6,$7)
`,
[
  student_id,
  tutor_name,
  subject,
  report_type,
  summary,
  recommendation,
  priority_level
]);

res.send("Reporte de tutor guardado");

} catch (error) {
console.error("Error guardando reporte:", error);
res.status(500).send("Error guardando reporte");
}
});

/* =========================================================
17 - PANEL DIRECTOR: CONSULTAR REPORTES
========================================================= */

app.get("/director/reports", async (req, res) => {
try {

const reports = await pool.query(`
  SELECT 
    id,
    student_id,
    tutor_name,
    subject,
    report_type,
    summary,
    recommendation,
    priority_level,
    reviewed_by_director,
    created_at
  FROM tutor_reports
  ORDER BY priority_level DESC, created_at DESC
`);

res.json(reports.rows);

} catch (error) {
console.error("Error obteniendo reportes:", error);
res.status(500).send("Error obteniendo reportes");
}
});

/* =========================================================
18 - DIRECTOR MARCAR REPORTE COMO REVISADO
========================================================= */

app.post("/director/review/:id", async (req, res) => {
try {

await pool.query(`
  UPDATE tutor_reports
  SET reviewed_by_director = TRUE
  WHERE id = $1
`, [req.params.id]);

res.send("Reporte marcado como revisado");

} catch (error) {
console.error(error);
res.status(500).send("Error revisando reporte");
}
});
/* =========================================================
19 - DECISIONES ACADÉMICAS DEL DIRECTOR
El Director toma decisiones pedagógicas estructurales
========================================================= */

app.post("/academic/director-decision", async (req, res) => {

try {

const {
  student_id,
  decision_type,
  subject,
  notes,
  priority_level
} = req.body;

await pool.query(`
  INSERT INTO director_decisions
  (
    student_id,
    decision_type,
    subject,
    notes,
    priority_level,
    created_at
  )
  VALUES ($1,$2,$3,$4,$5,NOW())
`,
[
  student_id,
  decision_type,
  subject,
  notes,
  priority_level || 1
]);

res.json({
  message: "Decisión académica registrada correctamente"
});

} catch (error) {

console.error("ERROR DIRECTOR DECISION:", error);

res.status(500).json({
  error: "No se pudo registrar la decisión académica"
});

}

});

/* =========================================================
20 - PERFIL VOCACIONAL DEL ESTUDIANTE
Evaluación de tendencias académicas
========================================================= */

app.post("/academic/vocational-profile", async (req, res) => {

try {

const {
  student_id,
  logical_score,
  linguistic_score,
  social_score,
  artistic_score,
  technical_score
} = req.body;

await pool.query(`
  INSERT INTO vocational_profiles
  (
    student_id,
    logical_score,
    linguistic_score,
    social_score,
    artistic_score,
    technical_score,
    evaluated_at
  )
  VALUES ($1,$2,$3,$4,$5,$6,NOW())
`,
[
  student_id,
  logical_score,
  linguistic_score,
  social_score,
  artistic_score,
  technical_score
]);

res.send("Perfil vocacional registrado");

} catch (error) {

console.error(error);

res.status(500).send("Error registrando perfil vocacional");

}

});

/* =========================================================
21 - ACCIONES DE LOS TUTORES
Permite registrar intervenciones pedagógicas
========================================================= */

app.post("/tutor/action", async (req, res) => {

try {

const {
  student_id,
  tutor_name,
  subject,
  action_type,
  description
} = req.body;

await pool.query(`
  INSERT INTO tutor_actions
  (
    student_id,
    tutor_name,
    subject,
    action_type,
    description,
    created_at
  )
  VALUES ($1,$2,$3,$4,$5,NOW())
`,
[
  student_id,
  tutor_name,
  subject,
  action_type,
  description
]);

res.send("Acción pedagógica registrada");

} catch (error) {

console.error("ERROR TUTOR ACTION:", error);

res.status(500).send("Error registrando acción");

}

});

/* =========================================================
22 - INICIALIZACIÓN DEL DIRECTOR ACADÉMICO
Activa el sistema pedagógico
========================================================= */

app.post("/academic/director/init", async (req, res) => {

try {

const {
  student_id,
  initial_diagnosis,
  recommended_grade
} = req.body;

await pool.query(`
  UPDATE students
  SET
    initial_diagnosis = $2,
    recommended_grade = $3,
    academic_status = 'active',
    director_initialized = TRUE
  WHERE id = $1
`,
[
  student_id,
  initial_diagnosis,
  recommended_grade
]);

res.json({
  message: "Director académico inicializado correctamente"
});

} catch (error) {

console.error("ERROR DIRECTOR INIT:", error);

res.status(500).send("Error inicializando director");

}

});

/* =========================================================
23 - ACCIONES PEDAGÓGICAS DEL DIRECTOR
Control estructural del proceso educativo
========================================================= */

app.post("/academic/director/action", async (req, res) => {

try {

const {
  student_id,
  action_type,
  subject,
  description
} = req.body;

await pool.query(`
  INSERT INTO director_actions
  (
    student_id,
    action_type,
    subject,
    description,
    created_at
  )
  VALUES ($1,$2,$3,$4,NOW())
`,
[
  student_id,
  action_type,
  subject,
  description
]);

res.send("Acción del director registrada");

} catch (error) {

console.error("ERROR DIRECTOR ACTION:", error);

res.status(500).send("Error registrando acción del director");

}

});

/* =========================================================
24 - PANEL ACADÉMICO DEL DIRECTOR
Vista completa del estudiante
========================================================= */

app.get("/academic/student-history/:email", async (req, res) => {

try {

const { email } = req.params;

const student = await pool.query(`
  SELECT *
  FROM students
  WHERE email = $1
`, [email]);

if (!student.rowCount) {
  return res.status(404).send("Estudiante no encontrado");
}

const student_id = student.rows[0].id;

const reports = await pool.query(`
  SELECT *
  FROM tutor_reports
  WHERE student_id = $1
  ORDER BY created_at DESC
`, [student_id]);

const decisions = await pool.query(`
  SELECT *
  FROM director_decisions
  WHERE student_id = $1
  ORDER BY created_at DESC
`, [student_id]);

res.json({
  student: student.rows[0],
  reports: reports.rows,
  decisions: decisions.rows
});

} catch (error) {

console.error("ERROR STUDENT HISTORY:", error);

res.status(500).send("Error obteniendo historial académico");

}

});
/* =========================================================
25 - REGISTRO ACADÉMICO GLOBAL
Resumen estructural del progreso del estudiante
========================================================= */

app.post("/academic/update-record", async (req, res) => {

try {

const {
  student_id,
  total_subjects,
  completed_subjects,
  graduation_eligible,
  academic_average
} = req.body;

await pool.query(`
  INSERT INTO academic_records
  (
    student_id,
    total_subjects,
    completed_subjects,
    graduation_eligible,
    academic_average,
    generated_at
  )
  VALUES ($1,$2,$3,$4,$5,NOW())
`,
[
  student_id,
  total_subjects,
  completed_subjects,
  graduation_eligible,
  academic_average
]);

res.json({
  message: "Expediente académico actualizado"
});

} catch (error) {

console.error("ERROR ACADEMIC RECORD:", error);

res.status(500).send("Error actualizando expediente");

}

});

/* =========================================================
26 - VERIFICACIÓN PÚBLICA DE DIPLOMA
Sistema antifalsificación
========================================================= */

app.get("/verify-diploma/:code", async (req, res) => {

try {

const { code } = req.params;

const result = await pool.query(`
  SELECT
    d.diploma_code,
    s.full_name,
    s.current_grade,
    d.created_at
  FROM diplomas d
  JOIN students s
  ON s.id = d.student_id
  WHERE d.diploma_code = $1
`,
[code]);

if (!result.rowCount) {
  return res.status(404).send("Diploma no encontrado");
}

res.json({
  valid: true,
  diploma: result.rows[0]
});

} catch (error) {

console.error("VERIFY DIPLOMA ERROR:", error);

res.status(500).send("Error verificando diploma");

}

});

/* =========================================================
27 - GENERACIÓN SEGURA DE DIPLOMA
Crea el código institucional único
========================================================= */

app.get("/academic/generate-diploma-secure/:student_id", async (req, res) => {

try {

const { student_id } = req.params;

const code = "MB-" + crypto.randomBytes(4).toString("hex").toUpperCase();

await pool.query(`
  INSERT INTO diplomas
  (
    student_id,
    diploma_code,
    created_at
  )
  VALUES ($1,$2,NOW())
`,
[
  student_id,
  code
]);

res.json({
  message: "Diploma generado",
  diploma_code: code
});

} catch (error) {

console.error("GENERATE DIPLOMA ERROR:", error);

res.status(500).send("Error generando diploma");

}

});

/* =========================================================
28 - GENERADOR PDF DE DIPLOMA (LUJO)
Diploma oficial MagicBank
========================================================= */

app.get("/academic/generate-diploma-pdf/:code", async (req, res) => {

try {

const { code } = req.params;

const diploma = await pool.query(`
  SELECT
    d.diploma_code,
    s.full_name,
    s.current_grade,
    d.created_at
  FROM diplomas d
  JOIN students s
  ON s.id = d.student_id
  WHERE d.diploma_code = $1
`,
[code]);

if (!diploma.rowCount) {
  return res.status(404).send("Diploma no encontrado");
}

const data = diploma.rows[0];

const doc = new PDFDocument({
  size: "A4",
  layout: "landscape"
});

res.setHeader("Content-Type", "application/pdf");

doc.pipe(res);

doc.fontSize(30)
  .text("MAGICBANK UNIVERSITY", {
    align: "center"
  });

doc.moveDown();

doc.fontSize(20)
  .text("Certificado Oficial", {
    align: "center"
  });

doc.moveDown();

doc.fontSize(16)
  .text(`Se certifica que`, {
    align: "center"
  });

doc.moveDown();

doc.fontSize(24)
  .text(`${data.full_name}`, {
    align: "center"
  });

doc.moveDown();

doc.fontSize(16)
  .text(`Ha completado satisfactoriamente el programa académico`, {
    align: "center"
  });

doc.moveDown();

doc.text(`Diploma Code: ${data.diploma_code}`, {
  align: "center"
});

doc.end();

} catch (error) {

console.error("PDF ERROR:", error);

res.status(500).send("Error generando PDF");

}

});
/* =========================================================
29 - ANCLAJE BLOCKCHAIN (PREPARADO)
Registro de diploma en blockchain
========================================================= */

app.post("/academic/blockchain-anchor", async (req, res) => {

try {

const {
  diploma_code,
  tx_hash
} = req.body;

await pool.query(`
  UPDATE diplomas
  SET blockchain_tx = $1
  WHERE diploma_code = $2
`,
[
  tx_hash,
  diploma_code
]);

res.json({
  message: "Diploma anclado en blockchain"
});

} catch (error) {

console.error("BLOCKCHAIN ERROR:", error);

res.status(500).send("Error anclando diploma");

}

});

/* =========================================================
30 - MONITOR DEL SISTEMA
Salud general del backend
========================================================= */

app.get("/system/health", async (req, res) => {

try {

const students = await pool.query(`
  SELECT COUNT(*) FROM students
`);

const diplomas = await pool.query(`
  SELECT COUNT(*) FROM diplomas
`);

res.json({

  status: "OK",

  system: "MagicBank Academic System",

  metrics: {

    students: students.rows[0].count,

    diplomas: diplomas.rows[0].count

  }

});

} catch (error) {

console.error("SYSTEM HEALTH ERROR:", error);

res.status(500).send("Sistema con errores");

}

});


/* =========================================================
31 - ACTIVAR ESTUDIANTE DESDE TUTOR
El tutor envía el token recibido por el alumno
========================================================= */

app.post("/activate-student", async (req, res) => {

try {

const { token } = req.body;

if (!token) {
return res.status(400).json({
error: "Token requerido"
});
}

/* 1 - convertir token a hash */

const tokenHash = crypto
.createHash("sha256")
.update(token)
.digest("hex");

/* 2 - buscar token en base de datos */

const result = await pool.query(
"SELECT email, product_name, area FROM access_tokens WHERE token = $1 AND expires_at > NOW()",
[tokenHash]
);

if (!result.rowCount) {
return res.status(403).json({
error: "Token inválido o expirado"
});
}

const { email, product_name, area } = result.rows[0];

/* 3 - verificar si el estudiante ya existe */

let student = await pool.query(
"SELECT id FROM students WHERE email = $1",
[email]
);

let student_id;

if (!student.rowCount) {

/* crear estudiante nuevo */

const created = await pool.query("INSERT INTO students (full_name,email,academic_status,created_at) VALUES ($1,$2,'active',NOW()) RETURNING id",
[
"Alumno MagicBank",
email
]);

student_id = created.rows[0].id;

} else {

student_id = student.rows[0].id;

}

/* 4 - devolver datos al tutor */
await pool.query(
`
INSERT INTO tutor_access_logs (student_id,email,tutor_name,program)
VALUES ($1,$2,$3,$4)
`,
[
student_id,
email,
product_name,
area
]
);
res.json({

status: "student_activated",

student_id,
email,
course: product_name,
area

});

} catch (error) {

console.error("ACTIVATE STUDENT ERROR:", error);

res.status(500).json({
error: "Error activando estudiante"
});

}

});

/* =========================================================
32 - ACTUALIZAR PERFIL INTELECTUAL DEL ESTUDIANTE
Director académico analiza progreso cognitivo
========================================================= */

app.post("/academic/update-intelligence-profile", async (req, res) => {

try {

const {

student_id,
logical_score,
linguistic_score,
social_score,
artistic_score,
technical_score,
learning_speed,
learning_style

} = req.body;

await pool.query(`
INSERT INTO student_intelligence_profiles
(
student_id,
logical_score,
linguistic_score,
social_score,
artistic_score,
technical_score,
learning_speed,
learning_style,
last_updated
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())

ON CONFLICT (student_id)

DO UPDATE SET

logical_score = EXCLUDED.logical_score,
linguistic_score = EXCLUDED.linguistic_score,
social_score = EXCLUDED.social_score,
artistic_score = EXCLUDED.artistic_score,
technical_score = EXCLUDED.technical_score,
learning_speed = EXCLUDED.learning_speed,
learning_style = EXCLUDED.learning_style,
last_updated = NOW()

`,
[
student_id,
logical_score,
linguistic_score,
social_score,
artistic_score,
technical_score,
learning_speed,
learning_style
]);

res.json({
message: "Perfil intelectual actualizado"
});

} catch (error) {

console.error("ERROR INTELLIGENCE PROFILE:", error);

res.status(500).send("Error actualizando perfil");

}

});
/* =========================================================
33 - CONSULTAR PERFIL INTELECTUAL DEL ESTUDIANTE
========================================================= */

app.get("/academic/intelligence-profile/:student_id", async (req, res) => {

try {

const { student_id } = req.params;

const profile = await pool.query("SELECT * FROM student_intelligence_profiles WHERE student_id = $1", [student_id]);

if (!profile.rowCount) {
return res.status(404).send("Perfil no encontrado");
}

res.json(profile.rows[0]);

} catch (error) {

console.error(error);

res.status(500).send("Error consultando perfil");

}

});

/* =========================================================
34 - AUDITORÍA DE ACCESO DE TUTORES
Registro institucional de activaciones
========================================================= */

app.post("/tutor/access-audit", async (req, res) => {

try {

const {
student_id,
email,
product_name,
area,
tutor_name
} = req.body;

const ip =
req.headers["x-forwarded-for"] ||
req.socket.remoteAddress ||
"unknown";

const userAgent =
req.headers["user-agent"] || "unknown";

await pool.query(`
INSERT INTO tutor_access_audit
(
student_id,
email,
product_name,
area,
tutor_name,
ip_address,
user_agent
)
VALUES ($1,$2,$3,$4,$5,$6,$7)
`,
[
student_id,
email,
product_name,
area,
tutor_name,
ip,
userAgent
]);

res.json({
status: "audit_logged"
});

} catch (error) {

console.error("AUDIT ERROR:", error);

res.status(500).json({
error: "Error registrando auditoría"
});

}

});
/*================================================
Endpoint  35. Auditoria al acceso del tutor
==================================================*/
app.get("/audit/tutor-access", async (req, res) => {

const logs = await pool.query(`
SELECT *
FROM tutor_access_audit
ORDER BY created_at DESC
LIMIT 100
`);

res.json(logs.rows);

});

/*≈≈=============================================
  36- api/validate
  ==≈≈=========================================*/

app.post("/api/validate-token", async (req, res) => {
  try {

    const rawToken = String(req.query.token || "")
  .replace(/\s+/g, "")
  .trim();
    const email = (req.body.email || "").trim().toLowerCase()

    /* puedes construir el device_id desde headers para no cambiar los 170 tutores */
    const deviceId = (
      req.headers["x-device-id"] ||
      req.headers["x-forwarded-for"] ||
      req.ip ||
      "unknown-device"
    ).toString()

    if (!rawToken) {
      return res.status(400).json({
        valid: false
      })
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex")

    const result = await pool.query(`
      SELECT
        email,
        product,
        expires_at,
        device_id,
        blocked_until
      FROM access_tokens
      WHERE token = $1
      LIMIT 1
    `, [tokenHash])

    if (!result.rowCount) {
      return res.status(200).json({
        valid: false
      })
    }

    const tokenData = result.rows[0]

    /* si el tutor envía email, validarlo */
    if (
      email &&
      tokenData.email &&
      tokenData.email.toLowerCase() !== email
    ) {
      return res.status(200).json({
        valid: false
      })
    }

    /* expirado */
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(200).json({
        valid: false
      })
    }

    /* bloqueado por actividad sospechosa */
    if (
      tokenData.blocked_until &&
      new Date(tokenData.blocked_until) > new Date()
    ) {
      return res.status(200).json({
        valid: false
      })
    }

    /* primer dispositivo */
    if (!tokenData.device_id) {
      await pool.query(`
        UPDATE access_tokens
        SET
          device_id = $1,
          activated_at = NOW(),
          last_access = NOW()
        WHERE token = $2
      `, [deviceId, tokenHash])

      return res.status(200).json({
        valid: true,
        email: tokenData.email,
        product: tokenData.product,
        expires_at: tokenData.expires_at
      })
    }

    /* mismo dispositivo */
    if (tokenData.device_id === deviceId) {
      await pool.query(`
        UPDATE access_tokens
        SET last_access = NOW()
        WHERE token = $1
      `, [tokenHash])

      return res.status(200).json({
        valid: true,
        email: tokenData.email,
        product: tokenData.product,
        expires_at: tokenData.expires_at
      })
    }

    /* dispositivo nuevo:
       se reemplaza el anterior y se guarda historial */
    await pool.query(`
      INSERT INTO device_history (
        token,
        old_device_id,
        new_device_id,
        changed_at
      )
      VALUES ($1, $2, $3, NOW())
    `, [tokenHash, tokenData.device_id, deviceId])

    /* demasiados cambios = sospechoso */
    const history = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM device_history
      WHERE token = $1
      AND changed_at > NOW() - INTERVAL '24 hours'
    `, [tokenHash])

    const changes = history.rows[0].total

    if (changes >= 5) {
      await pool.query(`
        UPDATE access_tokens
        SET blocked_until = NOW() + INTERVAL '24 hours'
        WHERE token = $1
      `, [tokenHash])

      return res.status(200).json({
        valid: false
      })
    }

    /* autorizar nuevo dispositivo y anular el anterior */
    await pool.query(`
      UPDATE access_tokens
      SET
        device_id = $1,
        last_access = NOW()
      WHERE token = $2
    `, [deviceId, tokenHash])

    return res.status(200).json({
      valid: true,
      email: tokenData.email,
      product: tokenData.product,
      expires_at: tokenData.expires_at
    })

  } catch (err) {
    console.error("VALIDATE TOKEN ERROR:", err)

    return res.status(200).json({
      valid: false
    })
  }
});
    

/* =========================================================
ENDPOINT — ANALYTICS BÁSICO DE REVIEWS
========================================================= */

app.get("/analytics/reviews", async (req, res) => {

  try {

    const result = await pool.query(`

      SELECT
        product_name,

        COUNT(*) as total_reviews,

        ROUND(AVG(rating),2) as avg_rating,

        COUNT(*) FILTER (WHERE category = 'clarity') as clarity_issues,
        COUNT(*) FILTER (WHERE category = 'speed') as speed_issues,
        COUNT(*) FILTER (WHERE category = 'interaction') as interaction_issues,
        COUNT(*) FILTER (WHERE category = 'difficulty') as difficulty_issues

      FROM student_feedback

      GROUP BY product_name

      ORDER BY avg_rating DESC

    `);

    res.json({
      analytics: result.rows
    });

  } catch (error) {

    console.error("ERROR ANALYTICS:", error);

    res.status(500).json({
      error: "Error obteniendo analytics"
    });

  }

});
/* =========================================================
ENDPOINT — RANKING DE TUTORES
========================================================= */

app.get("/analytics/ranking", async (req, res) => {

  try {

    const result = await pool.query(`

      SELECT
        product_name,

        COUNT(*) as total_reviews,

        ROUND(AVG(rating),2) as avg_rating,

        RANK() OVER (ORDER BY AVG(rating) DESC) as ranking_position

      FROM student_feedback

      GROUP BY product_name

      HAVING COUNT(*) >= 3

      ORDER BY avg_rating DESC

    `);

    res.json({
      ranking: result.rows
    });

  } catch (error) {

    console.error("ERROR RANKING:", error);

    res.status(500).json({
      error: "Error obteniendo ranking"
    });

  }

});

/*=========================================================
ENDPOINT — ANÁLISIS DE ABANDONO
========================================================= */

app.get("/analytics/abandonment", async (req, res) => {

  try {

    const result = await pool.query(`

      SELECT
        product_name,

        COUNT(*) as total_users,

        COUNT(*) FILTER (
          WHERE last_access < NOW() - INTERVAL '3 days'
        ) as abandoned_users,

        ROUND(
          COUNT(*) FILTER (
            WHERE last_access < NOW() - INTERVAL '3 days'
          ) * 100.0 / COUNT(*)
        ,2) as abandonment_rate

      FROM access_tokens

      GROUP BY product_name

      ORDER BY abandonment_rate DESC

    `);

    res.json({
      abandonment: result.rows
    });

  } catch (error) {

    console.error("ERROR ABANDONMENT:", error);

    res.status(500).json({
      error: "Error analizando abandono"
    });

  }

});

/* =========================================================
ENDPOINT — OPTIMIZACIÓN AUTOMÁTICA
========================================================= */

app.get("/analytics/optimization", async (req, res) => {

  try {

    const result = await pool.query(`

      SELECT
        f.product_name,

        COUNT(*) as total_reviews,
        ROUND(AVG(f.rating),2) as avg_rating,

        COUNT(*) FILTER (WHERE f.category = 'interaction') as interaction_issues,
        COUNT(*) FILTER (WHERE f.category = 'speed') as speed_issues,
        COUNT(*) FILTER (WHERE f.category = 'clarity') as clarity_issues,

        d.abandonment_rate

      FROM student_feedback f

      LEFT JOIN (
        SELECT
          product_name,
          ROUND(
            COUNT(*) FILTER (
              WHERE last_access < NOW() - INTERVAL '3 days'
            ) * 100.0 / COUNT(*)
          ,2) as abandonment_rate
        FROM access_tokens
        GROUP BY product_name
      ) d

      ON d.product_name = f.product_name

      GROUP BY f.product_name, d.abandonment_rate

    `);

    const analysis = result.rows.map(r => {

      let actions = [];

      // 🔴 rating bajo
      if (r.avg_rating < 4) {
        actions.push("Revisar tutor completo (rating bajo)");
      }

      // 🚪 abandono alto
      if (r.abandonment_rate > 30) {
        actions.push("Mejorar onboarding / reducir fricción inicial");
      }

      // ❓ demasiadas preguntas
      if (r.interaction_issues > r.total_reviews * 0.3) {
        actions.push("Reducir número de preguntas");
      }

      // ⚡ velocidad problema
      if (r.speed_issues > r.total_reviews * 0.3) {
        actions.push("Ajustar ritmo de enseñanza");
      }

      // 🧠 claridad
      if (r.clarity_issues > r.total_reviews * 0.3) {
        actions.push("Mejorar explicaciones (más ejemplos)");
      }

      return {
        product_name: r.product_name,
        avg_rating: r.avg_rating,
        abandonment_rate: r.abandonment_rate,
        actions
      };

    });

    res.json({
      optimization: analysis
    });

  } catch (error) {

    console.error("ERROR OPTIMIZATION:", error);

    res.status(500).json({
      error: "Error en optimización"
    });

  }

});

/* =========================================================
ENDPOINT — AUTOAJUSTE AUTOMÁTICO DE TUTORES
========================================================= */

app.get("/analytics/auto-adjust", async (req, res) => {

  try {

    const data = await pool.query(`

      SELECT
        product_name,

        COUNT(*) as total_reviews,

        COUNT(*) FILTER (WHERE category = 'interaction') as interaction_issues,
        COUNT(*) FILTER (WHERE category = 'speed') as speed_issues,
        COUNT(*) FILTER (WHERE category = 'clarity') as clarity_issues,

        ROUND(AVG(rating),2) as avg_rating

      FROM student_feedback

      GROUP BY product_name

    `);

    for (const r of data.rows) {

      let max_questions = 3;
      let explanation_depth = 3;
      let pacing_level = 3;

      // ❓ demasiadas preguntas
      if (r.interaction_issues > r.total_reviews * 0.3) {
        max_questions = 2;
      }

      // ⚡ problema de velocidad
      if (r.speed_issues > r.total_reviews * 0.3) {
        pacing_level = 2;
      }

      // 🧠 falta de claridad
      if (r.clarity_issues > r.total_reviews * 0.3) {
        explanation_depth = 4;
      }

      // 🔴 rating bajo general
      if (r.avg_rating < 4) {
        explanation_depth = 4;
        pacing_level = 2;
      }

      await pool.query(`
        INSERT INTO tutor_config
        (product_name, max_questions, explanation_depth, pacing_level, updated_at)
        VALUES ($1,$2,$3,$4,NOW())
        ON CONFLICT (product_name)
        DO UPDATE SET
          max_questions = EXCLUDED.max_questions,
          explanation_depth = EXCLUDED.explanation_depth,
          pacing_level = EXCLUDED.pacing_level,
          updated_at = NOW()
      `, [
        r.product_name,
        max_questions,
        explanation_depth,
        pacing_level
      ]);

    }

    res.json({
      status: "auto_adjust_completed"
    });

  } catch (error) {

    console.error("AUTO ADJUST ERROR:", error);

    res.status(500).json({
      error: "Error en autoajuste"
    });

  }

});

app.get("/api/tutor-config", async (req, res) => {
  try {
    const rawToken = req.query.token;

    if (!rawToken) {
      return res.status(400).json({
        error: "Token requerido"
      });
    }

    // 🔐 MISMO PROCESO QUE VALIDATE-TOKEN
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const result = await pool.query(`
      SELECT product_name
      FROM access_tokens
      WHERE token = $1
      AND expires_at > NOW()
    `, [tokenHash]);

    if (!result.rowCount) {
      return res.status(403).json({
        error: "Token inválido"
      });
    }

    const { product_name } = result.rows[0];

    // 🔽 CONFIG DEFAULT (luego se autoajusta)
    const config = await pool.query(`
      SELECT *
      FROM tutor_config
      WHERE product_name = $1
    `, [product_name]);

    if (!config.rowCount) {
      return res.json({
        product_name,
        tutor_config: {
          max_questions: 3,
          explanation_depth: 3,
          pacing_level: 3
        }
      });
    }

    return res.json({
      product_name,
      tutor_config: config.rows[0]
    });

  } catch (error) {
    console.error("ERROR TUTOR CONFIG:", error);
    res.status(500).json({
      error: "Error obteniendo configuración"
    });
  }
});

/* =========================================================
CATÁLOGO PÚBLICO PARA FRONTEND
========================================================= */

app.get("/api/catalogo-publico", (req, res) => {
  try {

    const catalog = SEARCH_CATALOG.map(item => ({
      nombre: item.nombre,
      area: item.area,
      url: item.url,
      keywords: item.keywords,
      prioridad: item.prioridad
    }));

    res.json(catalog);

  } catch (error) {

    console.error("ERROR CATALOGO PUBLICO:", error);

    res.status(500).json({
      error: "Error cargando catálogo"
    });

  }
});


/* =========================================================
API CHAT PRINCIPAL MAGICBANK + GRÁFICAS INTELIGENTES
========================================================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const VISUAL_GUIDE = {

  idiomas: {
    ingles: {
      animales: [
        "english animal flashcards for kids",
        "animal vocabulary english picture dictionary",
        "farm animals english visual chart",
        "wild animals vocabulary illustrated"
      ],
      frutas: [
        "fruit vocabulary english flashcards",
        "fruit names picture dictionary english",
        "fruits and colors educational chart"
      ],
      casa: [
        "rooms of the house english vocabulary",
        "house objects english flashcards",
        "living room kitchen bedroom visual chart"
      ],
      verbos: [
        "common verbs english illustrated chart",
        "action verbs flashcards english",
        "daily routines english visual learning"
      ],
      cuerpo_humano: [
        "body parts english flashcards",
        "human body vocabulary english for students"
      ],
      comida: [
        "food vocabulary english picture dictionary",
        "restaurant english vocabulary illustrated"
      ]
    }
  },

  cocina: {
    pizzas: {
      ingredientes: [
        "pizza ingredients infographic",
        "types of pizza ingredients visual chart",
        "pizza toppings comparison"
      ],
      preparacion: [
        "how to make pizza step by step infographic",
        "pizza dough preparation visual guide",
        "pizza baking process chart"
      ]
    },
    postres: {
      tortas: [
        "cake decoration ideas professional",
        "cake baking step by step infographic"
      ],
      helados: [
        "ice cream making process infographic",
        "types of ice cream visual chart"
      ]
    },
    bebidas: {
      frias: [
        "cold drinks preparation infographic",
        "smoothies and frappes visual recipes"
      ],
      calientes: [
        "coffee drinks types illustrated",
        "hot beverages preparation chart"
      ],
      cocteles: [
        "international cocktails infographic",
        "cocktail glass types chart",
        "bartender techniques illustrated"
      ]
    }
  },

  nutricion: {
    proteinas: [
      "high protein foods infographic",
      "protein sources comparison chart",
      "best protein foods illustrated"
    ],
    carbohidratos: [
      "healthy carbohydrates infographic",
      "simple vs complex carbohydrates chart"
    ],
    grasas: [
      "healthy fats vs bad fats infographic",
      "types of dietary fats chart"
    ],
    vitaminas: [
      "vitamin chart infographic",
      "foods rich in vitamins illustrated"
    ],
    dieta_equilibrada: [
      "balanced diet plate infographic",
      "healthy meal composition chart"
    ]
  },

  interiores: {
    salas: [
      "modern living room interior design inspiration",
      "living room styles comparison",
      "luxury living room decoration ideas"
    ],
    habitaciones: [
      "modern bedroom interior design",
      "bedroom styles comparison chart"
    ],
    cocinas: [
      "modern kitchen interior design",
      "kitchen layout ideas visual"
    ],
    colores: [
      "interior design color palette infographic",
      "wall color combinations interior design"
    ],
    estilos: [
      "minimalist vs classic interior design",
      "industrial modern bohemian interior styles"
    ]
  },

  derecho: {
    tribunal: [
      "courtroom judge lawyers trial infographic",
      "tribunal structure courtroom diagram",
      "criminal court process infographic"
    ],
    juzgado: [
      "difference between court and tribunal diagram",
      "judge office legal infographic"
    ],
    derecho_penal: [
      "criminal law infographic",
      "criminal justice system diagram",
      "criminal procedure flowchart"
    ],
    derecho_civil: [
      "civil law process infographic",
      "civil lawsuit stages chart"
    ],
    contratos: [
      "types of contracts infographic",
      "contract structure legal diagram"
    ]
  },

  contaduria: {
    balance_general: [
      "balance sheet infographic",
      "assets liabilities equity visual chart"
    ],
    estado_resultados: [
      "income statement infographic",
      "profit and loss statement visual guide"
    ],
    flujo_caja: [
      "cash flow infographic",
      "cash flow statement explained visually"
    ],
    contabilidad_basica: [
      "basic accounting concepts infographic",
      "debit and credit visual chart"
    ]
  },

  marketing: {
    branding: [
      "branding examples infographic",
      "brand identity design comparison"
    ],
    logos: [
      "famous logo styles comparison",
      "types of logos infographic"
    ],
    embudo: [
      "marketing funnel infographic",
      "sales funnel explained visually"
    ],
    redes_sociales: [
      "social media marketing strategy infographic",
      "instagram facebook tiktok marketing chart"
    ],
    packaging: [
      "product packaging design examples",
      "packaging styles comparison"
    ]
  },

  negocios: {
    modelo_negocio: [
      "business model canvas infographic",
      "business model examples chart"
    ],
    liderazgo: [
      "leadership styles infographic",
      "team management visual chart"
    ],
    emprendimiento: [
      "startup creation process infographic",
      "entrepreneurship roadmap visual"
    ],
    organigrama: [
      "company organizational chart",
      "business hierarchy infographic"
    ]
  },

  software: {
    html: [
      "html structure infographic",
      "basic html tags visual chart"
    ],
    css: [
      "css box model infographic",
      "css layout visual guide"
    ],
    javascript: [
      "javascript basics infographic",
      "javascript variables functions chart"
    ],
    bases_de_datos: [
      "database schema visual diagram",
      "sql tables relationship infographic"
    ],
    arquitectura: [
      "software architecture diagram",
      "frontend backend database visual chart"
    ]
  },

  bachillerato: {
    primaria: {
      primero: {
        letras: [
          "alphabet for children colorful chart",
          "letters and sounds educational poster"
        ],
        numeros: [
          "numbers 1 to 20 for children infographic",
          "counting objects educational chart"
        ],
        animales: [
          "farm animals for children flashcards",
          "wild animals educational poster kids"
        ]
      },
      segundo: {
        sumas: [
          "addition for kids visual chart",
          "basic addition illustrated exercises"
        ],
        restas: [
          "subtraction for children infographic",
          "subtracting with objects educational chart"
        ],
        sistema_solar: [
          "solar system for children colorful infographic",
          "planets for kids educational poster"
        ]
      },
      tercero: {
        multiplicacion: [
          "multiplication tables visual chart",
          "times tables for kids infographic"
        ],
        plantas: [
          "parts of a plant for children",
          "plant life cycle infographic kids"
        ],
        mapas: [
          "world map for children colorful",
          "continents and countries kids chart"
        ]
      },
      cuarto: {
        fracciones: [
          "fractions visual explanation for children",
          "fractions with pizza infographic"
        ],
        ecosistemas: [
          "ecosystems for children infographic",
          "forest desert ocean ecosystem chart"
        ],
        historia_antigua: [
          "ancient civilizations for students infographic",
          "egypt greece rome educational chart"
        ]
      },
      quinto: {
        geometria: [
          "geometry for elementary students",
          "angles and polygons visual chart"
        ],
        aparato_digestivo: [
          "digestive system for children diagram",
          "human body organs educational poster"
        ],
        energia: [
          "renewable energy for students infographic",
          "types of energy educational chart"
        ]
      }
    },

    secundaria: {
      sexto: {
        algebra_basica: [
          "basic algebra infographic for students",
          "variables and equations visual guide"
        ],
        celula: [
          "animal and plant cell labeled diagram",
          "cell structure infographic students"
        ],
        edad_media: [
          "middle ages timeline infographic",
          "medieval society visual chart"
        ]
      },
      septimo: {
        ecuaciones: [
          "linear equations explained visually",
          "equation solving infographic"
        ],
        sistema_respiratorio: [
          "respiratory system diagram students",
          "lungs and breathing infographic"
        ],
        geografia_fisica: [
          "mountains rivers plains infographic",
          "physical geography world map"
        ]
      },
      octavo: {
        funciones: [
          "functions and graphs infographic",
          "cartesian plane explained visually"
        ],
        fotosintesis: [
          "photosynthesis process infographic",
          "photosynthesis explained visually"
        ],
        revolucion_francesa: [
          "french revolution timeline infographic",
          "french revolution illustrated chart"
        ]
      },
      noveno: {
        trigonometria: [
          "trigonometry formulas infographic",
          "sine cosine tangent visual chart"
        ],
        genetica: [
          "basic genetics infographic",
          "DNA genes chromosomes explained visually"
        ],
        independencia_latinoamerica: [
          "latin america independence timeline",
          "independence movements infographic"
        ]
      },
      decimo: {
        calculo: [
          "introduction to calculus infographic",
          "derivatives visual explanation"
        ],
        quimica: [
          "periodic table infographic",
          "chemical bonds explained visually"
        ],
        primera_guerra_mundial: [
          "world war 1 timeline infographic",
          "first world war explained visually"
        ]
      },
      undecimo: {
        estadistica: [
          "statistics charts and graphs infographic",
          "mean median mode visual guide"
        ],
        fisica: [
          "newton laws infographic",
          "motion and forces visual chart"
        ],
        filosofia: [
          "history of philosophy timeline",
          "major philosophers infographic"
        ]
      }
    }
  },

  musica: {
    piano: {
      acordes: [
        "piano chords chart",
        "basic piano chords infographic"
      ],
      escalas: [
        "piano scales visual chart",
        "major minor scales piano"
      ],
      posicion_manos: [
        "piano hand position diagram",
        "correct piano posture infographic"
      ]
    },
    guitarra: {
      acordes: [
        "guitar chord chart beginner",
        "basic guitar chords infographic"
      ],
      escalas: [
        "guitar pentatonic scale chart",
        "guitar scales visual guide"
      ]
    },
    teoria: {
      notas: [
        "music notes chart",
        "musical notation basics infographic"
      ],
      armonia: [
        "music harmony infographic",
        "chord progression chart"
      ],
      instrumentos: [
        "orchestra instruments chart",
        "musical instruments families infographic"
      ]
    }
  }
};


function detectVisualQueries(message){
  const msg = message.toLowerCase();

  if(msg.includes("tribunal")) return VISUAL_GUIDE.derecho.tribunal;
  if(msg.includes("juzgado")) return VISUAL_GUIDE.derecho.juzgado;
  if(msg.includes("derecho penal")) return VISUAL_GUIDE.derecho.derecho_penal;

  if(msg.includes("pizza")) return VISUAL_GUIDE.cocina.pizzas.preparacion;
  if(msg.includes("coctel")) return VISUAL_GUIDE.cocina.bebidas.cocteles;

  // CORREGIDO
  if(msg.includes("fracciones")) {
    return VISUAL_GUIDE.bachillerato.primaria.cuarto.fracciones;
  }

  // CORREGIDO
  if(msg.includes("fotosintesis")) {
    return VISUAL_GUIDE.bachillerato.secundaria.octavo.fotosintesis;
  }

  if(msg.includes("piano")) return VISUAL_GUIDE.musica.piano.acordes;

  return [];
}
/* =========================================================
BUSCADOR DE GRÁFICAS
========================================================= */

async function getGraphics(query) {
  try {
    const results = [];

    /* ===== PIXABAY ===== */
    if (process.env.PIXABAY_KEY) {
      const pixabayResponse = await fetch(
        `https://pixabay.com/api/?key=${process.env.PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=8&safesearch=true`
      );

      const pixabayData = await pixabayResponse.json();

      (pixabayData.hits || []).forEach(img => {
        if (img.webformatURL) {
          results.push(img.webformatURL);
        }
      });
    }

    /* ===== UNSPLASH ===== */
    if (process.env.UNSPLASH_KEY) {
      const unsplashResponse = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=8`,
        {
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_KEY}`
          }
        }
      );

      const unsplashData = await unsplashResponse.json();

      (unsplashData.results || []).forEach(img => {
        if (img.urls?.regular) {
          results.push(img.urls.regular);
        }
      });
    }

    return [...new Set(results)].slice(0, 8);

  } catch (error) {
    console.error("GRAPHICS ERROR:", error);
    return [];
  }
}

/* =========================================================
ENDPOINT /api/chat
========================================================= */

app.post("/api/chat", async (req, res) => {

  try {

    /* =========================================================
    1 - MENSAJE DEL USUARIO
    ========================================================= */

    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({
        ok: false,
        reply: "No recibí ningún mensaje.",
        graphics: [],
        visualQuery: null
      });
    }

    /* =========================================================
    2 - RESPUESTA DEL TUTOR
    ========================================================= */

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",

      messages: [
        {
          role: "system",
          content: `
Eres un tutor experto de MagicBank.

Explica de forma:
- clara
- profunda
- elegante
- pedagógica
- muy visual

Cuando enseñes:
- usa ejemplos
- explica paso a paso
- divide por partes
- menciona conceptos importantes
- si el tema requiere apoyo visual, descríbelo claramente
`
        },
        {
          role: "user",
          content: message
        }
      ],

      temperature: 0.7,
      max_tokens: 1200
    });

    /* =========================================================
    3 - TEXTO FINAL DEL TUTOR
    ========================================================= */

    const reply =
      completion.choices?.[0]?.message?.content ||
      "No pude generar una respuesta.";
let graphics = [];

const visualQueries = detectVisualQueries(message);

for (const q of visualQueries) {
  const imgs = await getGraphics(q);
  graphics.push(...imgs);
}

graphics = [...new Set(graphics)].slice(0, 6);

const visualQuery =
  visualQueries.length > 0
    ? visualQueries[0]
    : null;

return res.json({
  ok: true,
  reply,
  graphics,
  visualQuery
});


    

    /* =========================================================
    6 - RESPUESTA FINAL
    ========================================================= */

    return res.json({
  ok: true,
  reply: reply,
  graphics: graphics,
  visualQuery: visualQuery
});

  } catch (error) {

    console.error("ERROR /api/chat:", error);

    return res.status(500).json({
      ok: false,
      reply: "Ocurrió un error interno en el tutor.",
      graphics: [],
      visualQuery: null
    });
  }

});

/* =========================================================
BLOQUE 2 — MOTOR DE RESPUESTA AVANZADO (SAFE EXTENSION)
NO INTERFIERE CON /api/chat
========================================================= */

/* 
Este bloque NO usa app.post
NO redefine variables del endpoint
NO rompe el servidor
Solo crea funciones auxiliares seguras
*/


/* ===============================
1. NORMALIZADOR UNIVERSAL
=============================== */

function normalizeText(text) {
  try {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  } catch (err) {
    console.error("NORMALIZE ERROR:", err.message);
    return "";
  }
}


/* ===============================
2. DETECTOR DE INTENCIÓN
=============================== */

function detectIntent(message) {
  try {

    const text = normalizeText(message);

    if (!text) return "empty";

    if (text.includes("hola") || text.includes("buenas")) {
      return "greeting";
    }

    if (text.includes("gracias")) {
      return "thanks";
    }

    if (text.includes("no entiendo") || text.includes("confuso")) {
      return "confusion";
    }

    if (text.includes("precio") || text.includes("cuanto cuesta")) {
      return "pricing";
    }

    if (text.includes("curso") || text.includes("clase")) {
      return "education";
    }

    return "general";

  } catch (err) {
    console.error("INTENT ERROR:", err.message);
    return "general";
  }
}


/* ===============================
3. GENERADOR DE RESPUESTA LOCAL
=============================== */

function generateSmartReply(message, context = "normal") {

  try {

    const intent = detectIntent(message);

    /* RESPUESTAS SEGÚN INTENCIÓN */

    if (intent === "greeting") {
      return "Hola 👋 Soy tu tutor IA de MagicBank. ¿Qué quieres aprender hoy?";
    }

    if (intent === "thanks") {
      return "Con gusto 🙌 Estoy aquí para ayudarte a aprender mejor.";
    }

    if (intent === "confusion") {
      return "Perfecto, vamos a simplificarlo. Dime exactamente qué parte no entiendes.";
    }

    if (intent === "pricing") {
      return "MagicBank funciona por acceso mensual. Puedes explorar Academy o University según tu objetivo.";
    }

    if (intent === "education") {
      return "Puedes elegir un tutor, comenzar desde tu nivel y avanzar progresivamente con guía inteligente.";
    }

    /* CONTEXTO COMO SEGUNDO FILTRO */

    if (context === "fast") {
      return "Respuesta rápida: enfócate en lo esencial y aplica de inmediato.";
    }

    if (context === "slow") {
      return "Vamos paso a paso. Primero lo básico, luego avanzamos.";
    }

    /* DEFAULT */

    return "Estoy listo para ayudarte. Hazme una pregunta concreta para avanzar mejor.";

  } catch (err) {
    console.error("REPLY ERROR:", err.message);
    return "Hubo un problema generando la respuesta.";
  }
}

/* =========================================================
BLOQUE 3 — WRAPPER DE RESPUESTA INTELIGENTE (SAFE)
NO MODIFICA ENDPOINT
========================================================= */


/* ===============================
1. WRAPPER PRINCIPAL
=============================== */

function buildFinalReply({ message, context, user }) {

  try {

    // Seguridad total de inputs
    const safeMessage = String(message || "");
    const safeContext = String(context || "normal");

    // Generar respuesta inteligente (usa bloque 2)
    const smartReply = generateSmartReply(safeMessage, safeContext);

    // Enriquecer respuesta (sin romper nada)
    return {
      ok: true,
      reply: smartReply,
      meta: {
        context: safeContext,
        timestamp: Date.now(),
        user: user || null
      }
    };

  } catch (err) {

    console.error("BUILD REPLY ERROR:", err.message);

    return {
      ok: false,
      reply: "Ocurrió un error generando la respuesta.",
      meta: {
        context: "error"
      }
    };
  }
}


/* ===============================
2. FALLBACK UNIVERSAL
=============================== */

function fallbackReply() {
  return {
    ok: false,
    reply: "No pude procesar tu mensaje. Intenta nuevamente.",
    meta: {
      context: "fallback"
    }
  };
}

/* =========================================================
BLOQUE 4 — INTEGRADOR DE RESPUESTA (SAFE)
NO CREA ENDPOINT
NO ROMPE /api/chat
========================================================= */


/* ===============================
1. PROCESADOR PRINCIPAL DE CHAT
=============================== */

function processChatMessage({ message, context, user }) {

  try {

    // Seguridad de datos
    const safeMessage = String(message || "");
    const safeContext = String(context || "normal");

    // Usar motor inteligente (bloque 2)
    const smart = generateSmartReply(safeMessage, safeContext);

    // Construcción final (bloque 3)
    const final = buildFinalReply({
      message: safeMessage,
      context: safeContext,
      user
    });

    // Si todo OK, usamos respuesta enriquecida
    if (final && final.ok) {
      return final;
    }

    // fallback interno
    return {
      ok: true,
      reply: smart,
      meta: {
        context: safeContext
      }
    };

  } catch (err) {

    console.error("PROCESS CHAT ERROR:", err.message);

    return fallbackReply();
  }
}


/* =========================================================
BLOQUE 6 — OPENAI SAFE (NO CRASH)
NO MODIFICA ENDPOINT
========================================================= */


/* ===============================
1. GENERADOR IA SEGURO
=============================== */

async function generateAIReplySafe(message, context) {

  try {

    // Seguridad total
    const safeMessage = String(message || "");
    const safeContext = String(context || "normal");

    // Si no hay API KEY → fallback inmediato (CRÍTICO)
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un tutor inteligente. Contexto del usuario: ${safeContext}`
          },
          {
            role: "user",
            content: safeMessage
          }
        ],
        max_tokens: 200
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 8000 // evita cuelgues
      }
    );

    const reply = response?.data?.choices?.[0]?.message?.content;

    if (!reply) return null;

    return reply;

  } catch (err) {

    console.error("OPENAI SAFE ERROR:", err.message);

    // 🔥 CLAVE: nunca rompe el flujo
    return null;
  }
}

/* =========================================================
BLOQUE 8 — FEEDBACK INTELIGENTE SAFE
NO MODIFICA ENDPOINT
========================================================= */


/* ===============================
1. CLASIFICADOR DE MENSAJE
=============================== */

function classifyUserFeedback(message) {

  try {

    const text = String(message || "").toLowerCase();

    if (!text) return "neutral";

    if (text.includes("no entiendo") || text.includes("confuso")) {
      return "clarity";
    }

    if (text.includes("difícil")) {
      return "difficulty";
    }

    if (text.includes("rápido") || text.includes("lento")) {
      return "speed";
    }

    if (text.includes("?")) {
      return "interaction";
    }

    return "normal";

  } catch (err) {
    console.error("FEEDBACK CLASSIFY ERROR:", err.message);
    return "normal";
  }
}


/* ===============================
2. GENERADOR DE RATING AUTOMÁTICO
=============================== */

function generateAutoRating(category) {

  try {

    if (category === "clarity") return 3;
    if (category === "difficulty") return 3;
    if (category === "speed") return 4;
    if (category === "interaction") return 5;

    return 5;

  } catch (err) {
    return 5;
  }
}


/* ===============================
3. GUARDADO SEGURO (NO CRASH DB)
=============================== */

async function saveFeedbackSafe({ email, product_name, message }) {

  try {

    if (!email || !product_name) return;

    const category = classifyUserFeedback(message);
    const rating = generateAutoRating(category);

    // 🔴 IMPORTANTE: esto puede fallar si la tabla no existe
    // pero está protegido → NO CRASHEA

    await pool.query(`
      INSERT INTO student_feedback
      (email, product_name, rating, category, created_at)
      VALUES ($1,$2,$3,$4,NOW())
    `, [
      email,
      product_name,
      rating,
      category
    ]);

  } catch (err) {

    // 🔥 CLAVE: solo log → nunca rompe backend
    console.error("FEEDBACK SAVE SAFE:", err.message);
  }
}






async function updateUserBehaviorSafe({ email, category }) {

  try {

    if (!email || !category) return;

    const existing = await pool.query(`
      SELECT change_count, last_preferences
      FROM user_behavior
      WHERE email = $1
    `, [email]);

    let change_count = 0;
    let last_preferences = category;

    if (existing.rowCount) {

      const prev = existing.rows[0];

      // si cambia comportamiento → suma
      if (prev.last_preferences !== category) {
        change_count = (prev.change_count || 0) + 1;
      } else {
        change_count = prev.change_count || 0;
      }

      await pool.query(`
        UPDATE user_behavior
        SET
          change_count = $2,
          last_preferences = $3,
          updated_at = NOW()
        WHERE email = $1
      `, [
        email,
        change_count,
        category
      ]);

    } else {

      await pool.query(`
        INSERT INTO user_behavior
        (email, change_count, last_preferences, updated_at)
        VALUES ($1,1,$2,NOW())
      `, [
        email,
        category
      ]);

    }

  } catch (err) {
    console.error("USER BEHAVIOR ERROR:", err.message);
  }
}

function buildUserProfile({ behavior, feedbackStats }) {

  try {

    let profile = "balanced";

    if (!behavior) return profile;

    const changes = behavior.change_count || 0;

    if (changes > 6) {
      return "unstable";
    }

    if (feedbackStats.clarity_issues > 3) {
      return "confused";
    }

    if (feedbackStats.speed_issues > 3) {
      return "slow";
    }

    if (feedbackStats.interaction_issues > 5) {
      return "impatient";
    }

    return "balanced";

  } catch (err) {
    return "balanced";
  }
}

/* =========================================================
BLOQUE 10 — AUTO-ADAPTACIÓN DEL TUTOR (SAFE)
NO MODIFICA ENDPOINT
========================================================= */


/* ===============================
1. OBTENER PERFIL ADAPTATIVO
=============================== */

async function getAdaptiveConfigSafe({ email, product_name }) {

  try {

    /* ===============================
    1. VALIDACIÓN BÁSICA
    =============================== */

    if (!email || !product_name) {
      return {
        pacing: 3,
        depth: 3,
        mode: "balanced"
      };
    }

    /* ===============================
    2. ANALÍTICA DE FEEDBACK RECIENTE
    =============================== */

    const result = await pool.query(`
      SELECT
        ROUND(AVG(rating),2) as avg_rating,
        COUNT(*) FILTER (WHERE category = 'clarity') as clarity_issues,
        COUNT(*) FILTER (WHERE category = 'speed') as speed_issues,
        COUNT(*) FILTER (WHERE category = 'interaction') as interaction_issues
      FROM student_feedback
      WHERE email = $1
      AND product_name = $2
      AND created_at > NOW() - INTERVAL '3 days'
    `, [email, product_name]);

    const feedbackStats = result.rowCount ? result.rows[0] : {
      avg_rating: 5,
      clarity_issues: 0,
      speed_issues: 0,
      interaction_issues: 0
    };

    /* ===============================
    3. COMPORTAMIENTO DEL USUARIO
    =============================== */

    let behavior = null;

    try {
      const behaviorResult = await pool.query(`
        SELECT change_count
        FROM user_behavior
        WHERE email = $1
      `, [email]);

      if (behaviorResult.rowCount) {
        behavior = behaviorResult.rows[0];
      }

    } catch (err) {
      console.error("BEHAVIOR READ ERROR:", err.message);
    }

    /* ===============================
    4. PERFIL DEL USUARIO
    =============================== */

    let profile = "balanced";

    try {

      const changes = behavior?.change_count || 0;

      if (changes > 6) {
        profile = "unstable";
      }
      else if (Number(feedbackStats.clarity_issues) > 3) {
        profile = "confused";
      }
      else if (Number(feedbackStats.speed_issues) > 3) {
        profile = "slow";
      }
      else if (Number(feedbackStats.interaction_issues) > 5) {
        profile = "impatient";
      }

    } catch (err) {
      console.error("PROFILE BUILD ERROR:", err.message);
    }

    /* ===============================
    5. CONFIGURACIÓN BASE
    =============================== */

    let pacing = 3;
    let depth = 3;
    let mode = "balanced";

    /* ===============================
    6. REGLAS ADAPTATIVAS
    =============================== */

    // 🔴 usuario inestable → bloquear cambios
    if (profile === "unstable") {
      return {
        pacing: 3,
        depth: 3,
        mode: "neutral_lock"
      };
    }

    // 🧠 usuario confundido → más explicación
    if (profile === "confused") {
      return {
        pacing: 2,
        depth: 4,
        mode: "explanatory"
      };
    }

    // ⚡ usuario impaciente → directo
    if (profile === "impatient") {
      return {
        pacing: 4,
        depth: 2,
        mode: "direct"
      };
    }

    // 🐢 usuario lento → bajar ritmo
    if (profile === "slow") {
      return {
        pacing: 2,
        depth: 3,
        mode: "calm"
      };
    }

    /* ===============================
    7. AJUSTE FINO POR FEEDBACK
    =============================== */

    if (Number(feedbackStats.clarity_issues) > 2) {
      depth = 4;
    }

    if (Number(feedbackStats.speed_issues) > 2) {
      pacing = 2;
    }

    if (Number(feedbackStats.interaction_issues) > 3) {
      depth = 2;
    }

    /* ===============================
    8. RETURN FINAL SEGURO
    =============================== */

    return {
      pacing,
      depth,
      mode
    };

  } catch (err) {

    console.error("ADAPTIVE CONFIG ERROR:", err.message);

    return {
      pacing: 3,
      depth: 3,
      mode: "balanced"
    };
  }
}

/* ===============================
2. AJUSTE DE RESPUESTA FINAL
=============================== */

function adaptReplyStyle(reply, config) {

  try {

    const safeReply = String(reply || "");

    if (!config) return safeReply;

    // Más simple
    if (config.depth === 2) {
      return safeReply.split(".").slice(0,1).join(".") + ".";
    }
if (config.risk === "frustrated") {
  return "Entiendo que esto puede estar siendo frustrante. Vamos a resolverlo paso a paso. " + safeReply;
}

if (config.risk === "abandonment") {
  return "Antes de continuar, quiero asegurarme de que esto te esté aportando valor. Ajustemos el enfoque. " + safeReply;
}
    // Más explicativo
    if (config.depth === 4) {
      return safeReply + " Te lo explico con más detalle si lo necesitas.";
    }

    return safeReply;

  } catch (err) {

    console.error("ADAPT STYLE ERROR:", err.message);

    return reply;
  }
}

async function detectUserRisk({ email, product_name }) {

  try {

    const feedback = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE rating <= 3) as low_rating,
        COUNT(*) FILTER (
          WHERE created_at > NOW() - INTERVAL '1 day'
        ) as recent_activity
      FROM student_feedback
      WHERE email = $1
      AND product_name = $2
    `, [email, product_name]);

    const behavior = await pool.query(`
      SELECT change_count
      FROM user_behavior
      WHERE email = $1
    `, [email]);

    const data = feedback.rows[0];
    const changes = behavior.rowCount ? behavior.rows[0].change_count : 0;

    let risk = "low";

    if (Number(data.low_rating) > 3) {
      risk = "frustrated";
    }

    if (changes > 6) {
      risk = "unstable";
    }

    if (Number(data.recent_activity) === 0) {
      risk = "abandonment";
    }

    return risk;

  } catch (err) {
    return "low";
  }
}



app.post("/api/landing-chat", (req, res) => {

try {

/* =========================================
NORMALIZADOR (SEGURO)
========================================= */

const normalize = (text = "") =>
String(text)
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
.trim();

/* =========================================
INPUT
========================================= */

const message = normalize(req.body && req.body.message ? req.body.message : "");

/* =========================================
ESTADO GLOBAL SIMPLE (SIN CRASH)
========================================= */

if (!global.userState) {
global.userState = {};
}

const state = global.userState;

/* =========================================
FLUJO: CONFIRMACIÓN DE CURSO
========================================= */

if (state.pendingCourse) {

if (
message === "si" ||
message === "sí" ||
message === "ok" ||
message.includes("explorar")
) {

const url = state.pendingCourse.url;
state.pendingCourse = null;

return res.json({
message: "Perfecto 🚀 Te llevo al curso...",
redirect: url
});
}

if (message.includes("no")) {

state.pendingCourse = null;

return res.json({
message: "Perfecto 👍 dime qué quieres aprender."
});
}

}

/* =========================================
RESPUESTA: MAGICBANK (COMPLETA)
========================================= */

if (
message.includes("magicbank") ||
message.includes("como funciona") ||
message.includes("como empezar") ||
message.includes("acceso") ||
message.includes("como estudiar")
) {

return res.json({
message: `MagicBank es un ecosistema educativo automatizado basado en tutores de inteligencia artificial.

No compras cursos.
Accedes a tutores especializados por 30 días.

━━━━━━━━━━━━━━━━━━
⚠️ FUNDAMENTO DEL SISTEMA
━━━━━━━━━━━━━━━━━━

MAGICBANK OPERA CON CHATGPT

Debes tener una cuenta activa en ChatGPT.

MagicBank potencia a ChatGPT
ChatGPT potencia a MagicBank

━━━━━━━━━━━━━━━━━━
FUNCIONAMIENTO
━━━━━━━━━━━━━━━━━━

1. Escoges el curso o tutor
2. Realizas el pago
3. Recibes en tu correo:
   - email
   - access token

4. Ingresas al tutor:
   - pegas email + token
   - clic en la flecha
   - acceso validado

El acceso dura 30 días
Puedes cancelarlo cuando quieras
Puedes cambiar de tutor
Puedes tener varios tutores

━━━━━━━━━━━━━━━━━━
USO CORRECTO DEL CHAT
━━━━━━━━━━━━━━━━━━

1. Haz clic en las 3 líneas
2. Busca el chat "access token"
3. Mantén presionado
4. Renombrar → MODULO 1

Luego:
MODULO 2, MODULO 3...

En cursos usa:
COCINA ASIATICA
COCINA MEDITERRANEA
COCINA MEXICANA

━━━━━━━━━━━━━━━━━━
REGLAS IMPORTANTES
━━━━━━━━━━━━━━━━━━

- No mezclar temas
- Un chat = un tema
- No mezclar voz y texto

El chat escrito es más preciso
El de voz es útil para idiomas

━━━━━━━━━━━━━━━━━━
CALIDAD ACADEMICA
━━━━━━━━━━━━━━━━━━

- Nivel superior (pregrado + especialización)
- Evaluación automática
- Certificación por tutor
- Futuro: blockchain

━━━━━━━━━━━━━━━━━━

Tutor completo:
https://chatgpt.com/g/g-697a851b8a148191a8971256abf33157-tutor-informativo-magibank
`
});
}

/* =========================================
BUSCADOR INTELIGENTE (CATÁLOGO REAL)
========================================= */

let bestMatch = null;
let bestScore = 0;

if (typeof SEARCH_CATALOG !== "undefined" && Array.isArray(SEARCH_CATALOG)) {

for (const c of SEARCH_CATALOG) {

let score = 0;

const nombre = normalize(c.nombre || "");
const keywords = Array.isArray(c.keywords)
? c.keywords.map(k => normalize(k))
: [];

/* MATCH FUERTE */
if (message.includes(nombre)) score += 50;

/* MATCH POR PALABRAS */
const words = message.split(" ");

for (const w of words) {

if (!w) continue;

if (nombre.includes(w)) score += 10;

for (const k of keywords) {
if (k.includes(w)) score += 6;
}

}

/* PRIORIDAD */
score += c.prioridad || 0;

/* MEJOR MATCH */
if (score > bestScore) {
bestScore = score;
bestMatch = c;
}

}

}

/* =========================================
SI DETECTA CURSO
========================================= */

if (bestMatch && bestScore >= 10) {

state.pendingCourse = bestMatch;

return res.json({
message: `Veo que te interesa ${bestMatch.nombre}. ¿Quieres explorar este curso ahora?`
});
}

/* =========================================
DEFAULT
========================================= */

return res.json({
message: "Dime exactamente qué quieres aprender y te guío paso a paso."
});

} catch (error) {

/* =========================================
ERROR CONTROLADO (NO CRASH)
========================================= */

console.error("LANDING CHAT ERROR:", error);

return res.json({
message: "Ocurrió un error. Intenta nuevamente."
});

}

});
setInterval(async () => {

  try {

    await pool.query(`

      INSERT INTO tutor_config
      (product_name, max_questions, explanation_depth, pacing_level, updated_at)

      SELECT
        product_name,

        CASE
          WHEN COUNT(*) FILTER (WHERE category = 'interaction') > COUNT(*) * 0.3
          THEN 2 ELSE 3
        END,

        CASE
          WHEN COUNT(*) FILTER (WHERE category = 'clarity') > COUNT(*) * 0.3
          THEN 4 ELSE 3
        END,

        CASE
          WHEN COUNT(*) FILTER (WHERE category = 'speed') > COUNT(*) * 0.3
          THEN 2 ELSE 3
        END,

        NOW()

      FROM student_feedback

      GROUP BY product_name

      ON CONFLICT (product_name)

      DO UPDATE SET

        max_questions = EXCLUDED.max_questions,
        explanation_depth = EXCLUDED.explanation_depth,
        pacing_level = EXCLUDED.pacing_level,
        updated_at = NOW()

    `);

    console.log("AUTO-OPTIMIZATION RUNNING");

  } catch (err) {

    console.error("AUTO OPTIMIZATION ERROR:", err.message);

  }

}, 1000 * 60 * 10); // cada 10 minutos

app.get("/system/alerts", async (req, res) => {

  try {

    const alerts = await pool.query(`

      SELECT
        email,
        product_name,

        COUNT(*) FILTER (WHERE rating <= 3) as low_scores,

        MAX(created_at) as last_feedback

      FROM student_feedback

      GROUP BY email, product_name

      HAVING COUNT(*) FILTER (WHERE rating <= 3) >= 3

    `);

    res.json({
      alerts: alerts.rows
    });

  } catch (error) {

    console.error("ALERT SYSTEM ERROR:", error);

    res.status(500).send("Error generating alerts");

  }

});

/* =========================================================
ACCESS PAGE MAGICBANK (ONBOARDING)
COPIAR Y PEGAR COMPLETO
========================================================= */

app.get("/access-page/:token", async (req, res) => {

  try {

    const rawToken = req.params.token;

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const result = await pool.query(`
      SELECT email, redirect_url
      FROM access_tokens
      WHERE token = $1
      AND expires_at > NOW()
    `, [tokenHash]);

    if (!result.rowCount) {
      return res.status(403).send("Acceso inválido o expirado");
    }

    const { email, redirect_url } = result.rows[0];

    /* =========================================================
    HTML COMPLETO
    ========================================================= */

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MagicBank · Acceso</title>

<style>
body { margin:0; font-family:system-ui; background:#f3f4f6; color:#111827; }

.header {
  background: linear-gradient(135deg,#5b4bdb,#6d5dfc);
  padding:20px; color:white; display:flex; justify-content:space-between;
}

.logo {
  width:45px;height:45px;border-radius:50%;background:white;color:#5b4bdb;
  display:flex;align-items:center;justify-content:center;font-weight:bold;
}

.container { max-width:850px;margin:auto;padding:20px; }

.card {
  background:white;border-radius:18px;padding:22px;margin-top:20px;
}

.access-box {
  background:#111827;color:#e5e7eb;padding:15px;border-radius:10px;
  margin-top:10px;white-space:pre-wrap;
}

button {
  width:100%;padding:16px;margin-top:10px;background:#6d5dfc;
  color:white;border:none;border-radius:14px;font-weight:bold;
}

.cta {
  display:block;text-align:center;padding:18px;margin-top:10px;
  background:#22c55e;color:white;border-radius:14px;text-decoration:none;
  font-weight:bold;
}

.highlight {
  background:#eef2ff;padding:12px;border-radius:10px;margin-top:10px;
}
</style>
</head>

<body>

<div class="header">
  <div class="logo">MB</div>
  <div>MAGICBANK</div>
</div>

<div class="container">

<div class="card">

<h1>🎓 Bienvenido a MagicBank</h1>

<p class="highlight">
Estás a punto de entrar a tu tutor inteligente.
</p>

<p>MagicBank es un sistema donde el tutor se adapta a ti.</p>

<hr>

<h2>🔐 Activa tu acceso</h2>

<p><strong>Primero copia tu acceso. Luego entra al tutor.</strong></p>

<div id="accessData" class="access-box">
Correo: ${email}
Token: ${rawToken}
</div>

<button onclick="copyAccess()">1️⃣ Copiar acceso</button>

<a href="${redirect_url}" target="_blank" class="cta">
2️⃣ Acceder al tutor
</a>

<div class="highlight">
Pega lo que copiaste → presiona la flecha → presiona confirmar → empieza el estudio
</div>

</div>

<div class="card">

<h2>📚 Cómo usar el tutor</h2>

<p>Cada chat es un tema diferente.</p>

<p>Arriba a la izquierda hay tres rayitas ☰</p>

<p>Ahí verás el chat llamado:</p>

<div class="highlight">AccessToken</div>

<p>Mantén presionado → Renombrar</p>

<p><strong>University:</strong> MODULO 1, MODULO 2</p>

<p><strong>Cursos:</strong> COCINA ESPAÑOLA, INGLES BASICO</p>

</div>

<div class="card">

<h2>⚠️ Reglas</h2>

<ul>
<li>No mezclar temas</li>
<li>Un chat = un tema</li>
<li>No mezclar voz y texto</li>
</ul>

</div>

</div>

<script>
function copyAccess() {
  const text = document.getElementById("accessData").innerText;
  navigator.clipboard.writeText(text);
  alert("Acceso copiado");
}
</script>

</body>
</html>
`;

    /* ========================================================= */

    res.send(html);

  } catch (error) {

    console.error("ACCESS PAGE ERROR:", error);
    res.status(500).send("Error cargando página");

  }

});


app.get("/temp/add-profile-columns", async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE access_tokens
      ADD COLUMN IF NOT EXISTS age TEXT,
      ADD COLUMN IF NOT EXISTS country TEXT,
      ADD COLUMN IF NOT EXISTS language TEXT,
      ADD COLUMN IF NOT EXISTS grade_level TEXT;
    `);

    res.json({
      ok: true,
      message: "Columnas de perfil agregadas"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

app.get("/temp/create-device-history-table", async (req, res) => {
  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_history (
        id SERIAL PRIMARY KEY,
        token_hash TEXT NOT NULL,
        previous_device_id TEXT,
        new_device_id TEXT,
        ip_address TEXT,
        changed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    res.send("device_history creada");

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});
app.get("/temp/check-access-security-columns", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'access_tokens'
      AND column_name IN (
        'device_id',
        'first_ip',
        'activated_at',
        'blocked_until',
        'last_access'
      )
      ORDER BY column_name
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/temp/check-device-history-table", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'device_history'
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/test-token/:token", async (req, res) => {
  try {
    const rawToken = req.params.token.trim()

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex")

    const result = await pool.query(`
      SELECT
        token,
        email,
        expires_at
      FROM access_tokens
      WHERE token = $1 OR token = $2
      LIMIT 1
    `, [rawToken, tokenHash])

    return res.json({
      rawToken,
      tokenHash,
      found: result.rowCount > 0,
      rows: result.rows
    })

  } catch (err) {
    return res.status(500).json({
      error: err.message
    })
  }
});

app.get("/api/validate-token", async (req, res) => {
  try {
    const rawToken = String(req.query.token || "")
      .replace(/\s+/g, "")
      .trim();

    const email = String(req.query.email || "").trim().toLowerCase();
    const deviceId = String(req.query.device_id || "").trim();

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const r = await pool.query(
      `
      SELECT token, email, expires_at, device_id
      FROM access_tokens
      WHERE token = $1
      AND email = $2
      AND expires_at > NOW()
      `,
      [tokenHash, email]
    );

    if (!r.rowCount) {
      return res.json({ valid: false });
    }

    const row = r.rows[0];

    if (!row.device_id) {
      await pool.query(
        `
        UPDATE access_tokens
        SET device_id = $1,
            activated_at = NOW(),
            last_access = NOW()
        WHERE token = $2
        `,
        [deviceId, tokenHash]
      );

      return res.json({
        valid: true,
        status: "first_device",
        email
      });
    }

    if (row.device_id === deviceId) {
      await pool.query(
        `
        UPDATE access_tokens
        SET last_access = NOW()
        WHERE token = $1
        `,
        [tokenHash]
      );

      return res.json({
        valid: true,
        status: "same_device",
        email
      });
    }

    await pool.query(
      `
      UPDATE access_tokens
      SET device_id = $1,
          last_access = NOW()
      WHERE token = $2
      `,
      [deviceId, tokenHash]
    );

    return res.json({
      valid: true,
      status: "device_changed",
      email
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      valid: false,
      error: err.message
    });
  }
});
/*=========================================================
START
==========≈================================================*/


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("MagicBank backend running on port", PORT);
});
