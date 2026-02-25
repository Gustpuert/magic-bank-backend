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
ANALYTICS DASHBOARD
========================= */

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
      total_alumnos: totalAlumnos.rows[0].count,
      cursos_top: cursosTop.rows,
      areas_top: areasTop.rows,
      ventas_por_dia: ventasPorDia.rows
    });

  } catch (err) {
    console.error("ERROR ANALYTICS:", err.message);
    res.status(500).send("Error analytics");
  }
});
/* =========================
DASHBOARD VISUAL
========================= */

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
      GROUP BY DATE(created_at) as fecha, COUNT(*) as total
      FROM access_tokens
      GROUP BY fecha
      ORDER BY fecha DESC
    `);

    res.send(`
      <html>
      <head>
        <title>MagicBank Analytics</title>
        <style>
          body { font-family: Arial; background:#0f172a; color:white; padding:30px; }
          h1 { color:#22d3ee; }
          .card { background:#1e293b; padding:20px; margin-bottom:20px; border-radius:10px; }
          table { width:100%; border-collapse: collapse; }
          th, td { padding:8px; text-align:left; }
          th { background:#334155; }
          tr:nth-child(even) { background:#1e293b; }
        </style>
      </head>
      <body>

        <h1>📊 MAGICBANK DASHBOARD</h1>

        <div class="card">
          <h2>Total Alumnos</h2>
          <h1>${totalAlumnos.rows[0].count}</h1>
        </div>

        <div class="card">
          <h2>🏆 Cursos más vendidos</h2>
          <table>
            <tr><th>Curso</th><th>Total</th></tr>
            ${cursosTop.rows.map(c =>
              `<tr><td>${c.product_name}</td><td>${c.total}</td></tr>`
            ).join("")}
          </table>
        </div>

        <div class="card">
          <h2>🏫 Áreas más solicitadas</h2>
          <table>
            <tr><th>Área</th><th>Total</th></tr>
            ${areasTop.rows.map(a =>
              `<tr><td>${a.area}</td><td>${a.total}</td></tr>`
            ).join("")}
          </table>
        </div>

        <div class="card">
          <h2>📈 Ventas por día</h2>
          <table>
            <tr><th>Fecha</th><th>Total</th></tr>
            ${ventasPorDia.rows.map(v =>
              `<tr><td>${v.fecha}</td><td>${v.total}</td></tr>`
            ).join("")}
          </table>
        </div>

      </body>
      </html>
    `);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error cargando dashboard");
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
CATALOGO CONGELADO HISTÓRICO
PRODUCT_ID + VARIANT_ID
========================= */

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

324464294:{
  variant:1438540878,
  area:"tutor",
  nombre:"TAP Contaduría",
  url:"https://chatgpt.com/g/g-69684f74a91c8191850a3f43493f2c78-tap-de-contaduria-accounting-pat"
}
};

/* =========================
WEBHOOK TIENDANUBE
========================= */
app.post("/webhooks/tiendanube/order-paid", async (req, res) => {
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
      [token,email,productId,curso.nombre,curso.area,curso.url]
    );

    await enviarCorreo(email, curso, token);

  } catch(err){
    console.error("ERROR:",err.response?.data||err.message);
  }
});

/* =========================
ACCESS
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
ENDPOINT TUTOR REPORT
COMUNICACIÓN REAL TUTOR → DB
========================= */

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
/* =========================
DIRECTOR - VER REPORTES
========================= */

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

/* =========================
DIRECTOR - MARCAR COMO REVISADO
========================= */

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
app.get("/director/review/test/:id", async (req, res) => {
  try {

    await pool.query(`
      UPDATE tutor_reports
      SET reviewed_by_director = TRUE
      WHERE id = $1
    `, [req.params.id]);

    res.send("Director revisó reporte correctamente");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error revisando reporte");
  }
});
app.get("/director/reports/pending", async (req, res) => {
  try {

    const r = await pool.query(`
      SELECT *
      FROM tutor_reports
      WHERE reviewed_by_director = false
      ORDER BY priority_level DESC, created_at DESC
    `);

    res.json(r.rows);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error obteniendo reportes");
  }
});

/* =========================
DIRECTOR - TOMAR DECISIÓN REAL
========================= */

app.post("/director/decision", async (req, res) => {
  try {

    const {
      student_id,
      tutor_name,
      alert_type,
      decision_taken,
      action_required,
      priority_level
    } = req.body;

    await pool.query(`
      INSERT INTO director_decisions
      (
        student_id,
        tutor_name,
        alert_type,
        decision_taken,
        action_required,
        priority_level,
        resolved,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,false,NOW())
    `,
    [
      student_id,
      tutor_name,
      alert_type,
      decision_taken,
      action_required,
      priority_level
    ]);

    res.send("Decisión del director guardada");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error guardando decisión");
  }
});
/* =========================
VOCATIONAL PROFILE - TUTOR & DIRECTOR WRITE
========================= */

app.post("/student/vocational/update", async (req, res) => {
  try {

    const {
      student_id,
      detected_strength,
      detected_difficulty,
      interest_area,
      recommended_path,
      tutor_observation,
      director_decision
    } = req.body;

    await pool.query(`
      INSERT INTO student_vocational_profile
      (
        student_id,
        detected_strength,
        detected_difficulty,
        interest_area,
        recommended_path,
        tutor_observation,
        director_decision,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
    `,
    [
      student_id,
      detected_strength,
      detected_difficulty,
      interest_area,
      recommended_path,
      tutor_observation,
      director_decision
    ]);

    res.send("Perfil vocacional actualizado");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error actualizando perfil vocacional");
  }
});
/* =========================
TUTOR - CONSULTAR DECISIONES DEL DIRECTOR
========================= */

app.get("/tutor/decisions/:student_id", async (req, res) => {
  try {

    const decisions = await pool.query(`
      SELECT 
        id,
        student_id,
        tutor_name,
        alert_type,
        decision_taken,
        action_required,
        priority_level,
        resolved,
        created_at
      FROM director_decisions
      WHERE student_id = $1
      ORDER BY created_at DESC
    `, [req.params.student_id]);

    res.json(decisions.rows);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error obteniendo decisiones del director");
  }
});

/* =========================
DIRECTOR - ACCIÓN PEDAGÓGICA OPERATIVA
CEREBRO INSTITUCIONAL REAL
========================= */

app.post("/director/action", async (req, res) => {
  try {

    const {
      student_id,
      tutor_name,
      alert_type,
      decision_taken,
      action_required,
      priority_level
    } = req.body;

    const allowedActions = [
      "reinforcement",
      "acceleration",
      "sabermode",
      "cognitive_pause",
      "certification_ready",
      "certification_denied"
    ];

    if (!allowedActions.includes(action_required)) {
      return res.status(400).send("Acción no permitida");
    }

    await pool.query(`
      INSERT INTO director_decisions
      (
        student_id,
        tutor_name,
        alert_type,
        decision_taken,
        action_required,
        priority_level,
        resolved,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,false,NOW())
    `,
    [
      student_id,
      tutor_name,
      alert_type,
      decision_taken,
      action_required,
      priority_level
    ]);

    res.send("Acción pedagógica del Director ejecutada");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error ejecutando acción del Director");
  }
});
/* =========================
PANEL DIRECTOR ACADÉMICO
CENTRO DE CONTROL INSTITUCIONAL
========================= */

app.get("/director/panel", async (req, res) => {
  try {

    const alertas = await pool.query(`
      SELECT COUNT(*) FROM tutor_reports
      WHERE report_type = 'alerta' AND reviewed_by_director = false
    `);

    const pendientes = await pool.query(`
      SELECT COUNT(*) FROM tutor_reports
      WHERE reviewed_by_director = false
    `);

    const refuerzos = await pool.query(`
      SELECT COUNT(*) FROM director_decisions
      WHERE action_required = 'reinforcement'
    `);

    const sabermode = await pool.query(`
      SELECT COUNT(*) FROM director_decisions
      WHERE action_required = 'sabermode'
    `);

    const certificables = await pool.query(`
      SELECT COUNT(*) FROM director_decisions
      WHERE action_required = 'certification_ready'
    `);

    const historial = await pool.query(`
      SELECT action_required, created_at
      FROM director_decisions
      ORDER BY created_at DESC
      LIMIT 20
    `);

    res.send(`
      <html>
      <head>
        <title>Director Académico - MagicBank</title>
        <style>
          body { font-family: Arial; background:#020617; color:white; padding:30px; }
          h1 { color:#38bdf8; }
          .card { background:#0f172a; padding:20px; margin-bottom:20px; border-radius:12px; }
          table { width:100%; border-collapse: collapse; }
          th, td { padding:8px; text-align:left; }
          th { background:#1e293b; }
          tr:nth-child(even) { background:#020617; }
        </style>
      </head>
      <body>

        <h1>🎓 PANEL DIRECTOR ACADÉMICO</h1>

        <div class="card">
          <h2>Alertas activas</h2>
          <h1>${alertas.rows[0].count}</h1>
        </div>

        <div class="card">
          <h2>Reportes pendientes</h2>
          <h1>${pendientes.rows[0].count}</h1>
        </div>

        <div class="card">
          <h2>Estudiantes en refuerzo</h2>
          <h1>${refuerzos.rows[0].count}</h1>
        </div>

        <div class="card">
          <h2>Modo SABER activo</h2>
          <h1>${sabermode.rows[0].count}</h1>
        </div>

        <div class="card">
          <h2>Listos para certificación</h2>
          <h1>${certificables.rows[0].count}</h1>
        </div>

        <div class="card">
          <h2>Historial de decisiones del Director</h2>
          <table>
            <tr><th>Acción</th><th>Fecha</th></tr>
            ${historial.rows.map(h =>
              `<tr><td>${h.action_required}</td><td>${h.created_at}</td></tr>`
            ).join("")}
          </table>
        </div>

      </body>
      </html>
    `);

  } catch (error) {
    console.error("ERROR PANEL DIRECTOR:", error);
    res.status(500).send(error.message);
  }
});

/* =========================
START
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log("MAGICBANK BACKEND ACTIVO EN PUERTO", PORT);
});
