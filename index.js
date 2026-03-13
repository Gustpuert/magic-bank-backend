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

324464294:{
variant:1438540878,
area:"tutor",
nombre:"TAP Contaduría",
url:"https://chatgpt.com/g/g-69684f74a91c8191850a3f43493f2c78-tap-de-contaduria-accounting-pat"
}

};

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
<a href="${curso.url}?token=${token}"
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

const rawToken = req.params.token;

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
TEMPORAL - AGREGAR CONTROL DE USO DE TOKEN
========================================================= */

app.get("/install-token-usage", async (req, res) => {

try {

await pool.query(`
ALTER TABLE access_tokens
ADD COLUMN IF NOT EXISTS token_uses INTEGER DEFAULT 0;
`);

await pool.query(`
ALTER TABLE access_tokens
ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 3;
`);

res.send("Control de uso de token instalado correctamente");

} catch (error) {

console.error("ERROR INSTALANDO CONTROL TOKEN:", error);

res.status(500).send("Error instalando control token");

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


// ======================================================
// ENDPOINT 36 — VALIDAR TOKEN DE ACCESO (validateAccess)
// ======================================================

app.post("/api/validate-token", async (req, res) => {

  try {

    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        valid: false,
        error: "Token y email son requeridos"
      });
    }

    // Generar hash SHA256 del token
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const result = await pool.query(
      `
      SELECT email, product_name, expires_at
      FROM access_tokens
      WHERE token = $1
      AND email = $2
      AND expires_at > NOW()
      `,
      [tokenHash, email]
    );

    // Token no encontrado o expirado
    if (result.rows.length === 0) {
      return res.status(401).json({
        valid: false,
        error: "Token inválido, expirado o no corresponde al correo"
      });
    }

    const access = result.rows[0];

    // Acceso válido
    res.json({
      valid: true,
      email: access.email,
      product: access.product_name,
      expires_at: access.expires_at
    });

  } catch (error) {

    console.error("ERROR VALIDATE TOKEN:", error);

    res.status(500).json({
      valid: false,
      error: "Error interno validando token"
    });

  }

});


app.post("/log-tutor-access", async (req, res) => {
  try {
    const { student_id, email, tutor_name, program } = req.body;

    const result = await pool.query(
      `INSERT INTO tutor_access_logs (student_id, email, tutor_name, program)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [student_id, email, tutor_name, program]
    );

    res.json({
      status: "access_logged",
      log: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "log_failed" });
  }
});

// ============================================================
// ENDPOINT TEMPORAL
// Crear estructura de tabla/colección tokens con campo activated
// Este endpoint se ejecuta una sola vez para preparar la base de datos
// Luego puede eliminarse del backend
// ============================================================

app.post("/api/setup/create-token-table", async (req, res) => {

  try {

    const collectionName = "tokens";

    const exists = await db.listCollections({ name: collectionName }).hasNext();

    if (exists) {

      return res.json({
        status: "already_exists",
        message: "La colección tokens ya existe."
      });

    }

    await db.createCollection(collectionName);

    await db.collection(collectionName).createIndex({ token: 1 }, { unique: true });

    res.json({
      status: "created",
      message: "Colección tokens creada correctamente con índice único para token.",
      fields: [
        "token",
        "email",
        "product",
        "expires_at",
        "activated"
      ]
    });

  } catch (error) {

    res.status(500).json({
      status: "error",
      message: "Error creando la colección tokens.",
      error: error.message
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("MagicBank backend running on port", PORT);
});
