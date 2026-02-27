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
      total_alumnos:Number (totalAlumnos.rows[0].count),
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
      SELECT DATE(created_at) as fecha, COUNT(*) as total
      FROM access_tokens
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
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
328032405:{
  variant:1458984295,
  area:"university",
  nombre:"Bachillerato completo MagicBank",
  url:"https://chatgpt.com/g/g-699cbbf2352081919bc18e03806c18aa-academic-director-tutor"
},
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
app.get("/onboarding/:token", async (req, res) => {

  const r = await pool.query(
    "SELECT email FROM access_tokens WHERE token=$1 AND expires_at>NOW()",
    [req.params.token]
  );

  if (!r.rowCount) {
    return res.status(403).send("Token inválido");
  }

  res.send(`
    <html>
    <body style="font-family:Arial;background:#0f172a;color:white;padding:40px;">
      <h2>🎓 Inscripción Oficial Bachillerato MagicBank</h2>

      <form method="POST" action="/onboarding/${req.params.token}">
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
});
/* =========================
STUDENT ENROLLMENT
INSCRIPCIÓN ACADÉMICA REAL
========================= */

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
app.get("/test/create-student", async (req, res) => {
  try {
    await pool.query(
      `
      INSERT INTO students (full_name, email, age, declared_grade, current_grade)
      VALUES ($1,$2,$3,$4,$4)
      `,
      [
        "Estudiante Prueba",
        "prueba@magicbank.org",
        15,
        9
      ]
    );

    res.send("Estudiante creado correctamente");

  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
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
app.get("/director/test/reinforcement", async (req, res) => {
  try {

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
      1,
      "Tutor Matemáticas",
      "bajo rendimiento",
      "Asignar refuerzo intensivo en álgebra",
      "reinforcement",
      2
    ]);

    res.send("Refuerzo aplicado correctamente");

  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});
/* =========================
INSCRIPCIÓN INDIVIDUAL ALUMNO
========================= */

app.post("/enroll-student", async (req, res) => {
  try {

    const { full_name, email, age, declared_grade } = req.body;

    if (!full_name || !email || !declared_grade) {
      return res.status(400).send("Datos incompletos");
    }

    await pool.query(
      `
      INSERT INTO students (full_name, email, age, declared_grade, current_grade)
      VALUES ($1, $2, $3, $4, $4)
      `,
      [full_name, email, age || null, declared_grade]
    );

    console.log("NUEVO ALUMNO INSCRITO:", email);

    res.send("Alumno inscrito correctamente");

  } catch (error) {
    console.error("ERROR en inscripción:", error);
    res.status(500).send("Error al inscribir alumno");
  }
});
/* =========================
PERFIL ACADÉMICO INICIAL
DESPUÉS DE INSCRIPCIÓN
========================= */

app.post("/student/academic-profile", async (req, res) => {
  try {

    const {
      student_id,
      country,
      schedule_preference,
      learning_mode,
      accepts_academic_rules,
      accepts_data_policy
    } = req.body;

    await pool.query(`
      INSERT INTO student_academic_profile
      (
        student_id,
        country,
        schedule_preference,
        learning_mode,
        accepts_academic_rules,
        accepts_data_policy,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
    `,
    [
      student_id,
      country,
      schedule_preference,
      learning_mode,
      accepts_academic_rules,
      accepts_data_policy
    ]);

    res.send("Perfil académico guardado");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error guardando perfil académico");
  }
});

app.post("/academic/director/action", async (req, res) => {
  try {
    const { action_type, student_id, data } = req.body;

    if (!action_type || !student_id) {
      return res.status(400).send("Faltan datos obligatorios");
    }

    switch (action_type) {

      case "diagnostic":
        await pool.query(`
          INSERT INTO student_diagnostic 
          (student_id, diagnostic_notes, math_level, language_level, science_level, social_level)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [
          student_id,
          data.diagnostic_notes,
          data.math_level,
          data.language_level,
          data.science_level,
          data.social_level
        ]);
        break;

      case "assign_grade":
        await pool.query(`
          UPDATE student_academic_status
          SET assigned_grade = $1, academic_state = 'activo'
          WHERE student_id = $2
        `, [data.assigned_grade, student_id]);
        break;

      case "update_progress":
        await pool.query(`
          INSERT INTO student_subject_progress (student_id, subject, progress, last_activity)
          VALUES ($1,$2,$3, NOW())
        `, [student_id, data.subject, data.progress]);
        break;

      case "certification_decision":
        await pool.query(`
          UPDATE student_certification_path
          SET approved = $1, certification_date = NOW()
          WHERE student_id = $2
        `, [data.approved, student_id]);
        break;

      default:
        return res.status(400).send("Acción no válida");
    }

    res.send("Acción académica ejecutada correctamente");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error ejecutando acción académica");
  }
});

app.post("/academic/adaptive-engine", async (req, res) => {
  const client = await pool.connect();

  try {

    const { student_id, action_mode, payload } = req.body;

    if (!student_id || !action_mode) {
      return res.status(400).send("Datos incompletos");
    }

    const studentCheck = await client.query(
      "SELECT id FROM students WHERE id = $1",
      [student_id]
    );

    if (!studentCheck.rowCount) {
      return res.status(404).send("Estudiante no encontrado");
    }

    await client.query("BEGIN");

    switch (action_mode) {

      /* =========================
      1️⃣ ASIGNACIÓN INICIAL
      ========================= */
      case "initial_assignment":

        await client.query(`
          INSERT INTO student_pedagogical_actions
          (student_id, action_type, description)
          VALUES ($1, 'initial_assignment', $2)
        `, [
          student_id,
          `Asignado tutor inicial: ${payload.primary_subject}`
        ]);
        let detectedLevel = null;

if (subject === "Matemáticas") detectedLevel = data.math_level;
if (subject === "Lengua") detectedLevel = data.language_level;
if (subject === "Ciencias") detectedLevel = data.science_level;
if (subject === "Sociales") detectedLevel = data.social_level;

// Si no viene nivel específico, usar declaredGrade como fallback
if (!detectedLevel) detectedLevel = declaredGrade;

await client.query(`
  INSERT INTO student_subject_progress
  (student_id, subject, current_level, progress_percentage, subject_status)
  VALUES ($1,$2,$3,0,'nivelacion')
  ON CONFLICT DO NOTHING
`, [student_id, subject, detectedLevel]);


        



        await client.query(`
          INSERT INTO student_schedule_control
          (student_id, tutor_name, subject, weekly_hours)
          VALUES ($1, $2, $3, $4)
        `, [
          student_id,
          payload.primary_subject,
          payload.primary_subject,
          payload.intensity || 5
        ]);

        break;

      /* =========================
      2️⃣ EVALUACIÓN DE PROGRESO
      ========================= */
      case "progress_evaluation":

        await client.query(`
          UPDATE student_subject_progress
          SET progress_percentage = $1,
              last_activity = NOW()
          WHERE student_id = $2
          AND subject = $3
        `, [
          payload.progress,
          student_id,
          payload.subject
        ]);

        if (payload.progress >= 70) {
          await client.query(`
            INSERT INTO student_pedagogical_actions
            (student_id, action_type, description)
            VALUES ($1, 'advance_subject', $2)
          `, [
            student_id,
            `Avance exitoso en ${payload.subject}`
          ]);
        }

        break;

      /* =========================
      3️⃣ REFUERZO
      ========================= */
      case "reinforcement_adjustment":

        await client.query(`
          UPDATE student_academic_status
          SET reinforcement_required = true
          WHERE student_id = $1
        `, [student_id]);

        await client.query(`
          INSERT INTO student_pedagogical_actions
          (student_id, action_type, description)
          VALUES ($1, 'reinforcement', $2)
        `, [
          student_id,
          `Refuerzo activado en ${payload.subject}`
        ]);

        break;

      /* =========================
      4️⃣ CERTIFICACIÓN
      ========================= */
      case "certification_evaluation":

        if (payload.approved === true) {

          await client.query(`
            UPDATE student_certification_path
            SET approved = true,
                certification_date = NOW()
            WHERE student_id = $1
          `, [student_id]);

          await client.query(`
            UPDATE student_academic_status
            SET certification_ready = true
            WHERE student_id = $1
          `, [student_id]);

        } else {

          await client.query(`
            INSERT INTO student_pedagogical_actions
            (student_id, action_type, description)
            VALUES ($1, 'certification_denied', 'Requiere refuerzo adicional')
          `, [student_id]);

        }

        break;

      default:
        await client.query("ROLLBACK");
        return res.status(400).send("Modo no válido");
    }

    await client.query("COMMIT");

    res.send("Motor académico ejecutado correctamente");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).send("Error ejecutando motor académico");
  } finally {
    client.release();
  }
});

app.get("/debug/schedule-columns", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'student_schedule_control'
      ORDER BY column_name;
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

/* =========================
DIRECTOR - DIAGNÓSTICO INICIAL AUTOMÁTICO
NACIMIENTO ACADÉMICO
========================= */

app.post("/academic/diagnostic", async (req, res) => {

  const client = await pool.connect();

  try {

    const { student_id, data } = req.body;

    if (!student_id || !data) {
      return res.status(400).send("Datos incompletos");
    }

    await client.query("BEGIN");

    // 1️⃣ Guardar diagnóstico
    await client.query(`
      INSERT INTO student_diagnostic
      (student_id, diagnostic_notes, math_level, language_level, science_level, social_level)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [
      student_id,
      data.diagnostic_notes,
      data.math_level,
      data.language_level,
      data.science_level,
      data.social_level
    ]);

    // 2️⃣ Obtener grado declarado
    const gradeResult = await client.query(
      "SELECT declared_grade FROM students WHERE id = $1",
      [student_id]
    );

    if (!gradeResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).send("Estudiante no encontrado");
    }

    const declaredGrade = gradeResult.rows[0].declared_grade;

    // 3️⃣ Crear estado académico
    await client.query(`
      INSERT INTO student_academic_status
      (student_id, assigned_grade, academic_state, reinforcement_required, certification_ready)
      VALUES ($1,$2,'activo',false,false)
      ON CONFLICT (student_id) DO NOTHING
    `, [student_id, declaredGrade]);

    // 4️⃣ Crear ruta certificación
    await client.query(`
      INSERT INTO student_certification_path
      (student_id, path_type, final_exam_required, approved)
      VALUES ($1,'curriculo_oficial',true,false)
      ON CONFLICT (student_id) DO NOTHING
    `, [student_id]);

    // 5️⃣ Currículo base
    const CURRICULO_BASE = {
      1:["Matemáticas","Lengua","Ciencias","Sociales"],
      2:["Matemáticas","Lengua","Ciencias","Sociales"],
      3:["Matemáticas","Lengua","Ciencias","Sociales"],
      4:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      5:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      6:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      7:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      8:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      9:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      10:["Matemáticas","Lengua","Física","Química","Sociales","Inglés","Filosofía"],
      11:["Matemáticas","Lengua","Física","Química","Sociales","Inglés","Filosofía"]
    };

    const subjects = CURRICULO_BASE[declaredGrade] || [];
    const baseHours = 4;

    for (const subject of subjects) {

      await client.query(`
        INSERT INTO student_subject_progress
        (student_id, subject, progress_percentage, subject_status)
        VALUES ($1,$2,0,'activo')
        ON CONFLICT DO NOTHING
      `, [student_id, subject]);

      await client.query(`
        INSERT INTO student_schedule_control
        (student_id, tutor_name, subject, weekly_hours)
        VALUES ($1,$2,$2,$3)
        ON CONFLICT DO NOTHING
      `, [student_id, subject, baseHours]);

    }

    await client.query("COMMIT");

    res.send("Diagnóstico y nacimiento académico completado");

  } catch (error) {

    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).send("Error ejecutando diagnóstico académico");

  } finally {

    client.release();

  }

});

/* =========================
TEST DIAGNÓSTICO POR URL
(SOLO PRUEBA)
========================= */

app.get("/academic/test-diagnostic/:student_id", async (req, res) => {

  const client = await pool.connect();

  try {

    const student_id = req.params.student_id;

    await client.query("BEGIN");

    // Diagnóstico básico automático
    await client.query(`
      INSERT INTO student_diagnostic
      (student_id, diagnostic_notes, math_level, language_level, science_level, social_level)
      VALUES ($1,'Diagnóstico automático URL','medio','medio','medio','medio')
    `, [student_id]);

    const gradeResult = await client.query(
      "SELECT declared_grade FROM students WHERE id = $1",
      [student_id]
    );

    if (!gradeResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).send("Estudiante no encontrado");
    }

    const declaredGrade = gradeResult.rows[0].declared_grade;

    await client.query(`
      INSERT INTO student_academic_status
      (student_id, assigned_grade, academic_state, reinforcement_required, certification_ready)
      VALUES ($1,$2,'activo',false,false)
      ON CONFLICT (student_id) DO NOTHING
    `, [student_id, declaredGrade]);

    // 4️⃣ Ruta certificación (adaptado a tu tabla real)

await pool.query(`
  DELETE FROM student_certification_path
  WHERE student_id = $1
`, [student_id]);

await pool.query(`
  INSERT INTO student_certification_path
  (student_id, completed_subjects, readiness_level, certification_ready, director_validation, created_at)
  VALUES ($1, 0, 'inicial', false, false, NOW())
`, [student_id]);

    const CURRICULO_BASE = {
      1:["Matemáticas","Lengua","Ciencias","Sociales"],
      2:["Matemáticas","Lengua","Ciencias","Sociales"],
      3:["Matemáticas","Lengua","Ciencias","Sociales"],
      4:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      5:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      6:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      7:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      8:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      9:["Matemáticas","Lengua","Ciencias","Sociales","Inglés"],
      10:["Matemáticas","Lengua","Física","Química","Sociales","Inglés","Filosofía"],
      11:["Matemáticas","Lengua","Física","Química","Sociales","Inglés","Filosofía"]
    };

    const subjects = CURRICULO_BASE[declaredGrade] || [];
    const baseHours = 4;

    for (const subject of subjects) {

      await client.query(`
        INSERT INTO student_subject_progress
        (student_id, subject, progress_percentage, subject_status)
        VALUES ($1,$2,0,'activo')
        ON CONFLICT DO NOTHING
      `, [student_id, subject]);

      await client.query(`
        INSERT INTO student_schedule_control
        (student_id, tutor_name, subject, weekly_hours)
        VALUES ($1,$2,$2,$3)
        ON CONFLICT DO NOTHING
      `, [student_id, subject, baseHours]);

    }

    await client.query("COMMIT");

    res.send("Diagnóstico ejecutado correctamente vía URL");

  } catch (error) {

    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).send("Error ejecutando diagnóstico");

  } finally {

    client.release();

  }

});






app.get("/admin/fix-current-level-integer", async (req, res) => {
  try {

    await pool.query(`
      ALTER TABLE student_subject_progress
      ALTER COLUMN current_level TYPE INTEGER
      USING current_level::integer;
    `);

    await pool.query(`
      ALTER TABLE student_subject_progress
      ALTER COLUMN current_level SET DEFAULT NULL;
    `);

    await pool.query(`
      ALTER TABLE student_subject_progress
      ADD CONSTRAINT current_level_positive
      CHECK (current_level IS NULL OR current_level >= 0);
    `);

    res.send("current_level convertido correctamente a INTEGER");

  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

app.get("/admin/check-current-level-type", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'student_subject_progress'
      AND column_name = 'current_level';
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});
/* ========================
START
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log("MAGICBANK BACKEND ACTIVO EN PUERTO", PORT);
});
