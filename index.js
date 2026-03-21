/* =========================================================
01 - CONFIGURACIÓN GLOBAL DEL SISTEMA
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

const { Pool } = pkg;

const app = express();

/* =========================================================
02 - MIDDLEWARE DEL SERVIDOR
========================================================= */

app.use(cors());
app.use(express.json());

/* =========================================================
03 - CONEXIÓN BASE DE DATOS
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
========================================================= */

app.get("/", (_, res) => {
  res.send("MAGICBANK BACKEND ACTIVO");
});

/* =========================================================
05 - ANALYTICS DEL SISTEMA
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
========================================================= */

app.get("/dashboard", async (req, res) => {
  try {

    const totalAlumnos = await pool.query(`
      SELECT COUNT(*) FROM access_tokens
    `);

    res.send(`
      <html>
      <head>
        <title>MagicBank Analytics</title>
      </head>
      <body>
        <h1>MAGICBANK DASHBOARD</h1>
        <p>Total alumnos: ${totalAlumnos.rows[0].count}</p>
      </body>
      </html>
    `);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error cargando dashboard");
  }
});

/* =========================================================
07 - AUTENTICACIÓN TIENDANUBE (OAUTH)
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

const CATALOGO = {

315067943:{variant:1395732685,area:"academy",nombre:"Italiano",url:"https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb"},
315067695:{variant:1395731561,area:"academy",nombre:"Portugués",url:"https://chatgpt.com/g/g-694ff45ee8a88191b72cd536885b0876-tutor-de-portugues-mb"},
315067368:{variant:1395730081,area:"academy",nombre:"Chino",url:"https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin"},
315067066:{variant:1395728497,area:"academy",nombre:"Alemán",url:"https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-tutor-de-aleman-mb"},
310587272:{variant:1378551257,area:"academy",nombre:"Inglés",url:"https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622"},
310589317:{variant:1378561580,area:"academy",nombre:"Francés",url:"https://chatgpt.com/g/g-692af8c0b460819197c6c780bb96aaed"},
314000543:{
variant:1474729666,
area:"academy",
nombre:"Español",
url:"https://chatgpt.com/g/g-69b43351db6081919e0dcfb02e5fb003-tutor-de-espanol"
},
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

324464294:{
variant:1438540878,
area:"tutor",
nombre:"TAP Contaduría",
url:"https://chatgpt.com/g/g-69684f74a91c8191850a3f43493f2c78-tap-de-contaduria-accounting-pat"
}

};

// ======================================================
// 37 - CATÁLOGO PÚBLICO CONGELADO (OFICIAL)
// NO MODIFICAR DINÁMICAMENTE
// ======================================================

const CATALOGO_PUBLICO = [

{
"nombre":"Español",
"area":"academy",
"url":"https://magicbank2.mitiendanube.com/productos/curso-de-espanol-gj55x/",
"keywords":["espanol","idioma","lengua","curso","aprender español"],
"prioridad":10
},
{
"nombre":"Inglés",
"area":"academy",
"url":"https://magicbank2.mitiendanube.com/productos/curso-avanzado-de-ingles-con-magic-tutor-pro/",
"keywords":["ingles","english","idioma","curso"],
"prioridad":10
},
{
"nombre":"Portugués",
"area":"academy",
"url":"https://magicbank2.mitiendanube.com/productos/curso-de-portugues/",
"keywords":["portugues","idioma","curso"],
"prioridad":8
},
{
"nombre":"Chino",
"area":"academy",
"url":"https://magicbank2.mitiendanube.com/productos/curso-de-chino/",
"keywords":["chino","mandarin","idioma"],
"prioridad":8
},
{
"nombre":"Italiano",
"area":"academy",
"url":"https://magicbank2.mitiendanube.com/productos/curso-de-italiano/",
"keywords":["italiano","idioma"],
"prioridad":7
},

{
"nombre":"Curso de Francés",
"url":"https://magicbank2.mitiendanube.com/productos/curso-avanzado-de-frances-con-tutor-ia/",
"keywords":["frances","idioma","francia"],
"prioridad":9
},
{
"nombre":"Curso de Alemán",
"url":"https://magicbank2.mitiendanube.com/productos/curso-de-aleman/",
"keywords":["aleman","idioma"],
"prioridad":9
},

{
"nombre":"Curso de Cocina Avanzada",
"url":"https://magicbank2.mitiendanube.com/productos/curso-de-cocina-avanzado-con-tutor-con-ia/",
"keywords":["cocina","chef","recetas"],
"prioridad":9
},
{
"nombre":"Curso de Nutrición Inteligente",
"url":"https://magicbank2.mitiendanube.com/productos/nutricion-inteligente-avanzada-con-tutor-ia/",
"keywords":["nutricion","salud","alimentacion"],
"prioridad":9
},

{
"nombre":"Curso Avanzado de ChatGPT",
"url":"https://magicbank2.mitiendanube.com/productos/curso-profesional-de-chatgpt/",
"keywords":["chatgpt","ia","inteligencia artificial"],
"prioridad":10
},

{
"nombre":"Curso de Trading Cíclico",
"url":"https://magicbank2.mitiendanube.com/productos/trading-ciclico-social/",
"keywords":["trading","inversion","mercado"],
"prioridad":10
},
{
"nombre":"Curso de Banca Digital",
"url":"https://magicbank2.mitiendanube.com/productos/magicbank-curso-de-banca-digital1/",
"keywords":["banca","finanzas","digital"],
"prioridad":9
},

{
"nombre":"Artes y oficios",
"area":"academy",
"url":"https://magicbank2.mitiendanube.com/productos/artes-y-oficios-magicbank/",
"keywords":["oficios","manualidades","trabajo"],
"prioridad":10
},
{
"nombre":"Diseño de interiores",
"area":"academy",
"url":"https://magicbank2.mitiendanube.com/productos/curso-diseno-de-interiores-profesional-gj1bk/",
"keywords":["diseño","decoracion","hogar"],
"prioridad":9
},

{
"nombre":"TAP Salud",
"url":"https://magicbank2.mitiendanube.com/productos/tap-salud/",
"keywords":["salud","medicina"],
"prioridad":10
},
{
"nombre":"TAP Derecho",
"url":"https://magicbank2.mitiendanube.com/productos/tap-derecho/",
"keywords":["derecho","abogado"],
"prioridad":10
},
{
"nombre":"TAP Contaduría",
"url":"https://magicbank2.mitiendanube.com/productos/asistente-profesional-para-contabilidad-b14t5/",
"keywords":["contabilidad","finanzas"],
"prioridad":10
},
{
"nombre":"TAP Empresas",
"url":"https://magicbank2.mitiendanube.com/productos/tap-empresas/",
"keywords":["empresa","negocio"],
"prioridad":10
},
{
"nombre":"TAP Ingeniería",
"url":"https://magicbank2.mitiendanube.com/productos/tap-ingenieros/",
"keywords":["ingenieria","tecnico"],
"prioridad":10
},
{
"nombre":"TAP Educación",
"url":"https://magicbank2.mitiendanube.com/productos/tap-educacion/",
"keywords":["educacion","docente","clases"],
"prioridad":10
},

{
"nombre":"Bachillerato MagicBank",
"url":"https://magicbank2.mitiendanube.com/productos/magicbank-university1/",
"keywords":["bachillerato","colegio"],
"prioridad":10
},

{
"nombre":"Conservatorio musical",
"url":"https://magicbank2.mitiendanube.com/productos/facultad-de-musica-6k2ph/",
"keywords":["musica","instrumentos"],
"prioridad":10
},

{
"nombre":"Marketing",
"url":"https://magicbank2.mitiendanube.com/productos/facultad-de-marketing/",
"keywords":["marketing","ventas"],
"prioridad":8
},
{
"nombre":"Contaduría",
"url":"https://magicbank2.mitiendanube.com/productos/facultad-de-contaduria/",
"keywords":["contabilidad","contador"],
"prioridad":9
},
{
"nombre":"Derecho",
"url":"https://magicbank2.mitiendanube.com/productos/curso-facultad-de-derecho/",
"keywords":["derecho","leyes"],
"prioridad":9
},
{
"nombre":"Software",
"url":"https://magicbank2.mitiendanube.com/productos/facultad-de-desarrollo-de-software/",
"keywords":["programacion","software"],
"prioridad":9
},

{
"nombre":"Facultad de Administración y Negocios",
"area":"university",
"url":"https://magicbank2.mitiendanube.com/productos/facultad-de-administracion-y-negocios/",
"keywords":["administracion","negocios","empresa","gestion","estrategia","emprendimiento"],
"prioridad":10
}

];

app.get("/audit/tutor-access", async (req, res) => {
  try {
    const logs = await pool.query(`
      SELECT * FROM tutor_access_audit
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(logs.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error auditoría" });
  }
});

app.post("/api/validate-token", async (req, res) => {
  try {
    const { token, email } = req.body;

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const result = await pool.query(`
      SELECT email FROM access_tokens
      WHERE token = $1 AND email = $2 AND expires_at > NOW()
    `,[tokenHash,email]);

    res.json({ valid: result.rowCount > 0 });

  } catch (error) {
    res.status(500).json({ valid:false });
  }
});

app.get("/api/catalog", (req, res) => {
  try {
    const catalog = Object.keys(CATALOGO).map(id => {
      const item = CATALOGO[id];
      return {
        nombre: item.nombre,
        area: item.area,
        url: item.url
      };
    });
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ error:"catalog error"});
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("MagicBank backend running on port", PORT);
});
