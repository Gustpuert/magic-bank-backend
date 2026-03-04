import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import crypto from "crypto";
import pkg from "pg";
import cors from "cors";
const { Pool } = pkg;

const app = express();

const PORT = process.env.PORT || 8080;
app.use(cors());
app.use(express.json());
import QRCode from "qrcode";

/* =========================
DATABASE (RAILWAY)
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,                // máximo conexiones simultáneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
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
  url:"https://chatgpt.com/g/g-699e59962d20819194b173b12f4857ed-bachillerato-director-academivo-tutor-pro"
},
324464294:{
  variant:1438540878,
  area:"tutor",
  nombre:"TAP Contaduría",
  url:"https://chatgpt.com/g/g-69684f74a91c8191850a3f43493f2c78-tap-de-contaduria-accounting-pat"
}
};
/* =========================
   RESEND MAIL
========================= */

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
    Formación estructurada • Control institucional • Certificación con criterio
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
/* =========================
WEBHOOK TIENDANUBE
VERSIÓN SEGURA Y ESTABLE
NO ROMPE FUNCIONAMIENTO ACTUAL
========================= */

app.post("/webhooks/tiendanube/order-paid", async (req, res) => {

  // ⚡ Responder inmediatamente a Tiendanube
  res.sendStatus(200);

  try {

    const orderId = req.body?.id;
    if (!orderId) {
      console.warn("Webhook recibido sin orderId");
      return;
    }

    // 1️⃣ Verificar que la orden no haya sido procesada antes
    const existingOrder = await pool.query(
      "SELECT 1 FROM processed_orders WHERE order_id = $1",
      [orderId]
    );

    if (existingOrder.rowCount > 0) {
      console.log("Orden ya procesada anteriormente:", orderId);
      return;
    }

    // 2️⃣ Obtener credenciales de la tienda
    const store = await pool.query(
      "SELECT store_id, access_token FROM tiendanube_stores LIMIT 1"
    );

    if (!store.rowCount) {
      console.error("No hay tienda conectada");
      return;
    }

    const { store_id, access_token } = store.rows[0];

    // 3️⃣ Consultar orden oficial en Tiendanube
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

    if (order.data.payment_status !== "paid") {
      console.log("Orden no pagada:", orderId);
      return;
    }

    // 4️⃣ Extraer email del cliente
    const email =
      order.data.contact_email ||
      order.data.customer?.email ||
      order.data.billing_address?.email;

    if (!email) {
      console.warn("Orden sin email:", orderId);
      return;
    }

    const productId =
      order.data.order_products?.[0]?.product_id ||
      order.data.products?.[0]?.product_id;

    const variantId =
      order.data.order_products?.[0]?.variant_id ||
      order.data.products?.[0]?.variant_id;

    let curso = CATALOGO[productId];

    if (!curso) {
      for (const id in CATALOGO) {
        if (CATALOGO[id].variant == variantId) {
          curso = CATALOGO[id];
          break;
        }
      }
    }

    if (!curso) {
      console.warn("Producto no encontrado en catálogo:", productId, variantId);
      return;
    }

    // 5️⃣ Generar token real
    const rawToken = crypto.randomBytes(32).toString("hex");

    // 6️⃣ Hashear token antes de guardar
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // 7️⃣ Guardar token en base de datos
    await pool.query(
      `
      INSERT INTO access_tokens
      (token, email, product_id, product_name, area, redirect_url, expires_at)
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

    // 8️⃣ Marcar orden como procesada (anti-duplicado real)
    
await pool.query(
  `
  INSERT INTO processed_orders (order_id, raw_order, created_at)
  VALUES ($1,$2,NOW())
  ON CONFLICT (order_id) DO NOTHING
  `,
  [orderId, JSON.stringify(order.data)]
);
    // 9️⃣ Enviar correo con token real
    await enviarCorreo(email, curso, rawToken);

    console.log("Webhook procesado correctamente:", orderId);

  } catch (err) {
    console.error("ERROR WEBHOOK:", err.response?.data || err.message);
  }

});
/* ===============================
TUTORES OFICIALES BACHILLERATO MAGICBANK
MAPEO REAL GPT (NO EXPUESTO EN CORREO)
================================ */

const TUTOR_GPTS = {
  matematicas: "https://chatgpt.com/g/g-699bcab04a3c81918adc1061209889af-bachiller-matematicas-tutor-pro",
  "ciencias-naturales": "https://chatgpt.com/g/g-699e260ae5f08191ace18acfd628fd6b-bachillerato-tutor-de-ciencias-naturales",
  lenguaje: "https://chatgpt.com/g/g-699e327b46848191af476ddc6ee9c091-bachillerato-tutor-lenguaje",
  "ciencias-sociales": "https://chatgpt.com/g/g-699e331abc048191b5377e84353e159d-bachillerato-tutor-de-ciencias-sociales",
  "etica-valores": "https://chatgpt.com/g/g-699e3504f2248191a39334f24854a0e5-bachillerato-tutor-de-etica-y-valores-humanos",
  "tecnologia-informatica": "https://chatgpt.com/g/g-699e35c46f348191b350b97f4bf0a544-bachillerato-tutor-de-tecnologia-e-informatica",
  "educacion-artistica": "https://chatgpt.com/g/g-699e36eae2bc81919dfe01a0b18c67f3-bachillerato-tutor-educacion-artistica-y-cultural",
  "educacion-fisica": "https://chatgpt.com/g/g-699e37946b888191b14c5fe1572f55a3-bachillerato-tutor-de-educacion-fisica-y-deporte",
  "educacion-religiosa": "https://chatgpt.com/g/g-699e382245b08191a9824537ddea9faf-bachillerato-tutor-de-educacion-religiosa",
  ingles: "https://chatgpt.com/g/g-699e366421f08191b14fc6af17f251fd-bachillerato-tutor-de-ingles"
};

async function asignarTutoresBachillerato(student_id) {

  const tutoresBachillerato = [
    "matematicas",
    "lenguaje",
    "ciencias-naturales",
    "ciencias-sociales",
    "etica-valores",
    "tecnologia-informatica",
    "educacion-artistica",
    "educacion-fisica",
    "educacion-religiosa",
    "ingles"
  ];

  for (let tutor of tutoresBachillerato) {

    await pool.query(`
      INSERT INTO student_active_tutors (student_id, tutor_area)
      VALUES ($1,$2)
      ON CONFLICT DO NOTHING
    `, [student_id, tutor]);

  }

}
/* =========================
ACCESS
========================= */
app.get("/access/:token", async (req, res) => {

  try {

    const rawToken = req.params.token;

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const r = await pool.query(
      `
      SELECT redirect_url
      FROM access_tokens
      WHERE token = $1
      AND expires_at > NOW()
      `,
      [tokenHash]
    );

    if (!r.rowCount) {
      return res.status(403).send("Acceso inválido");
    }

    res.redirect(r.rows[0].redirect_url);

  } catch (error) {

    console.error(error);
    res.status(500).send("Error validando acceso");

  }

});

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
/* =========================================
   DIRECTOR SUBMIT INSTITUCIONAL
   MODELO C DEFINITIVO MAGICBANK
========================================= */

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

    // 🔐 HASHEAR TOKEN
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // 1️⃣ Validar token
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

    // 2️⃣ Crear o actualizar estudiante
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

    // 3️⃣ Activar tutores si aplica
    let tutoresActivar = [];

    if (product_name === "Bachillerato completo MagicBank") {
      tutoresActivar = [
        "matematicas",
        "lenguaje",
        "ciencias-naturales",
        "ciencias-sociales",
        "etica-valores",
        "tecnologia-informatica",
        "educacion-artistica",
        "educacion-fisica",
        "educacion-religiosa",
        "ingles"
      ];
    }

    for (let tutor of tutoresActivar) {
      await pool.query(`
        INSERT INTO student_active_tutors (student_id, tutor_area)
        VALUES ($1,$2)
        ON CONFLICT DO NOTHING
      `, [student_id, tutor]);
    }

    const botones = tutoresActivar.map(t =>
      `
      <p>
        <a href="https://magic-bank-backend-production-713e.up.railway.app/tutor/${t}?token=${token}">
          Acceder Tutor ${t.replace("-", " ")}
        </a>
      </p>
      `
    ).join("");

    await axios.post(
      "https://api.resend.com/emails",
      {
        from: "Director MagicBank <director@send.magicbank.org>",
        to: email,
        subject: "Asignación Oficial de Tutores MagicBank",
        html: `
          <div style="font-family:Arial;">
            <h2>🎓 Proceso Académico Activado</h2>
            <p>Hola ${full_name},</p>
            <p>El Director Académico ha activado tus tutores oficiales:</p>
            ${botones}
            <p>Todos los accesos están protegidos institucionalmente.</p>
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
/* =========================================
   DIRECTOR AUTOMÁTICO INICIALIZADOR
   MODELO C – INSTITUCIONAL MAGICBANK
========================================= */

app.get("/director/initialize/:token", async (req, res) => {

  try {

    const rawToken = req.params.token;

    // 🔐 HASHEAR TOKEN
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const access = await pool.query(`
      SELECT email, product_name, area
      FROM access_tokens
      WHERE token = $1
      AND expires_at > NOW()
    `, [tokenHash]);

    if (!access.rowCount) {
      return res.status(403).send("Token inválido o expirado");
    }

    const { email, product_name } = access.rows[0];

    const studentCheck = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [email]
    );

    let student_id;

    if (!studentCheck.rowCount) {

      const newStudent = await pool.query(`
        INSERT INTO students (full_name, email, declared_grade, current_grade)
        VALUES ($1,$2,1,1)
        RETURNING id
      `, ["Alumno MagicBank", email]);

      student_id = newStudent.rows[0].id;

    } else {

      student_id = studentCheck.rows[0].id;

    }

    if (product_name === "Bachillerato completo MagicBank") {

      const tutoresBachillerato = [
        "matematicas",
        "lenguaje",
        "ciencias-naturales",
        "ciencias-sociales",
        "etica-valores",
        "tecnologia-informatica",
        "educacion-artistica",
        "educacion-fisica",
        "educacion-religiosa",
        "ingles"
      ];

      for (let tutor of tutoresBachillerato) {
        await pool.query(`
          INSERT INTO student_active_tutors (student_id, tutor_area)
          VALUES ($1,$2)
          ON CONFLICT DO NOTHING
        `, [student_id, tutor]);
      }

      const botones = tutoresBachillerato.map(t =>
        `
        <p>
          <a href="https://magic-bank-backend-production-713e.up.railway.app/tutor/${t}?token=${rawToken}">
            Acceder Tutor ${t}
          </a>
        </p>
        `
      ).join("");

      await axios.post(
        "https://api.resend.com/emails",
        {
          from: "Director MagicBank <director@send.magicbank.org>",
          to: email,
          subject: "Asignación Oficial Bachillerato MagicBank",
          html: `
            <div style="font-family:Arial;">
              <h2>🎓 Bienvenido al Bachillerato MagicBank</h2>
              <p>El Director Académico ha activado tus tutores oficiales:</p>
              ${botones}
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
    }

    res.send(`
      <html>
        <body style="font-family:Arial;background:#020617;color:white;padding:40px;">
          <h2>🎓 Inicialización Académica Completa</h2>
          <p>Tu proceso institucional fue activado correctamente.</p>
          <p>Revisa tu correo para acceder a tus tutores oficiales.</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error("ERROR DIRECTOR INITIALIZE:", error);
    res.status(500).send("Error inicializando proceso académico");
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
      priority_level,
      director_justification
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

    // 🔴 VALIDACIÓN OBLIGATORIA PARA CERTIFICACIÓN
    if (action_required === "certification_ready") {
      if (!director_justification || director_justification.trim().length < 20) {
        return res.status(400).send("Justificación obligatoria para certificar");
      }

      await pool.query(`
        UPDATE student_certification_path
        SET approved = true,
            certification_date = NOW(),
            director_validation = true
        WHERE student_id = $1
      `, [student_id]);

      await pool.query(`
        UPDATE student_academic_status
        SET certification_ready = true
        WHERE student_id = $1
      `, [student_id]);
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

    res.send("Acción del Director ejecutada correctamente");

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

/* =========================================
   MOTOR ADAPTATIVO ACADÉMICO COMPLETO
   ALERTA AUTOMÁTICA INSTITUCIONAL INCLUIDA
========================================= */

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
         CON ALERTA AUTOMÁTICA
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

        // 🔴 ALERTA AUTOMÁTICA SI PROGRESO < 40
        if (payload.progress < 40) {

          await client.query(`
            INSERT INTO tutor_reports
            (student_id, tutor_name, subject, report_type, summary, recommendation, priority_level)
            VALUES ($1,$2,$3,'alerta',$4,$5,2)
          `, [
            student_id,
            payload.tutor_name || 'Tutor Automático',
            payload.subject,
            `Progreso crítico detectado (${payload.progress}%)`,
            'Se recomienda refuerzo estructural inmediato'
          ]);

        }

        // 🟢 REPORTE DE AVANCE SI PROGRESO >= 70
        if (payload.progress >= 70) {

          await client.query(`
            INSERT INTO tutor_reports
            (student_id, tutor_name, subject, report_type, summary, recommendation, priority_level)
            VALUES ($1,$2,$3,'avance',$4,$5,1)
          `, [
            student_id,
            payload.tutor_name || 'Tutor Automático',
            payload.subject,
            `Dominio sólido detectado (${payload.progress}%)`,
            'Posible aceleración o evaluación superior'
          ]);

        }

        break;


      /* =========================
         3️⃣ REFUERZO ESTRUCTURAL
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



/* =========================
DIRECTOR - DIAGNÓSTICO INICIAL AUTOMÁTICO
NACIMIENTO ACADÉMICO
========================= */

app.post("/academic/diagnostic", async (req, res) => {

  const client = await pool.connect();

  try {

    const { student_id, data } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: "student_id requerido" });
    }

    await client.query("BEGIN");

    // 1️⃣ Guardar diagnóstico
    await client.query(`
      INSERT INTO student_diagnostic
      (student_id, diagnostic_notes, math_level, language_level, science_level, social_level)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [
      student_id,
      data?.diagnostic_notes || "Diagnóstico inicial",
      data?.math_level || 1,
      data?.language_level || 1,
      data?.science_level || 1,
      data?.social_level || 1
    ]);

    // 2️⃣ Obtener grado declarado
    const gradeResult = await client.query(
      "SELECT declared_grade FROM students WHERE id = $1",
      [student_id]
    );

    if (!gradeResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    const declaredGrade = gradeResult.rows[0].declared_grade;

    // 3️⃣ Crear o actualizar estado académico
    await client.query(`
      INSERT INTO student_academic_status
      (student_id, assigned_grade, academic_state, reinforcement_required, certification_ready)
      VALUES ($1,$2,'activo',false,false)
      ON CONFLICT DO NOTHING
    `, [student_id, declaredGrade]);

    // 4️⃣ Crear ruta certificación
    await client.query(`
      INSERT INTO student_certification_path
      (student_id, completed_subjects, readiness_level, certification_ready, director_validation, created_at)
      VALUES ($1,0,'inicial',false,false,NOW())
      ON CONFLICT DO NOTHING
    `, [student_id]);

    // 5️⃣ Materias base (solo si no existen)
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

      const exists = await client.query(`
        SELECT id FROM student_subject_progress
        WHERE student_id = $1 AND subject = $2
      `, [student_id, subject]);

      if (!exists.rowCount) {

        await client.query(`
          INSERT INTO student_subject_progress
          (student_id, subject, current_level, progress_percentage, subject_status)
          VALUES ($1,$2,$3,0,'activo')
        `, [student_id, subject, declaredGrade]);

        await client.query(`
          INSERT INTO student_schedule_control
          (student_id, tutor_name, subject, weekly_hours)
          VALUES ($1,$2,$2,$3)
        `, [student_id, subject, baseHours]);

      }

    }
    // =============================
// VALIDACIÓN INSTITUCIONAL AUTOMÁTICA
// =============================

const validation = await client.query(`
  SELECT 
    s.id as student_id,
    COUNT(DISTINCT sp.subject) as subjects_created,
    COUNT(DISTINCT sc.subject) as schedule_created
  FROM students s
  LEFT JOIN student_subject_progress sp ON sp.student_id = s.id
  LEFT JOIN student_schedule_control sc ON sc.student_id = s.id
  WHERE s.id = $1
  GROUP BY s.id
`, [student_id]);

const validationReport = validation.rows[0] || {
  student_id,
  subjects_created: 0,
  schedule_created: 0
};

    await client.query("COMMIT");

    res.json({
      message: "Diagnóstico académico ejecutado correctamente",
      student_id,
      assigned_grade: declaredGrade
    });

  } catch (error) {

    await client.query("ROLLBACK");
    console.error("ERROR DIAGNÓSTICO:", error);

    res.status(500).json({
      message: "Error ejecutando diagnóstico",
      error: error.message,
      detail: error.detail,
      code: error.code
    });

  } finally {

    client.release();

  }

});

app.get("/academic/validate/:student_id", async (req, res) => {

  try {

    const { student_id } = req.params;

    const student = await pool.query(
      "SELECT declared_grade FROM students WHERE id = $1",
      [student_id]
    );

    if (!student.rowCount) {
      return res.status(404).json({ error: "Estudiante no existe" });
    }

    const declaredGrade = student.rows[0].declared_grade;

    const status = await pool.query(
      "SELECT * FROM student_academic_status WHERE student_id = $1",
      [student_id]
    );

    const certification = await pool.query(
      "SELECT * FROM student_certification_path WHERE student_id = $1",
      [student_id]
    );

    const subjects = await pool.query(
      `
      SELECT ss.id, catalog.name, ss.current_level
      FROM student_subjects ss
      JOIN academic_subjects_catalog catalog
      ON ss.subject_id = catalog.id
      WHERE ss.student_id = $1
      `,
      [student_id]
    );

    let structural_status = "OK";

    if (!status.rowCount || !certification.rowCount || !subjects.rowCount) {
      structural_status = "CRITICAL";
    }

    const levelMismatch = subjects.rows.filter(
      s => Number(s.current_level) !== Number(declaredGrade)
    );

    if (levelMismatch.length > 0 && structural_status !== "CRITICAL") {
      structural_status = "WARNING";
    }

    res.json({
      student_id: Number(student_id),
      declared_grade: Number(declaredGrade),
      academic_status_exists: status.rowCount > 0,
      certification_path_exists: certification.rowCount > 0,
      subjects_created: subjects.rowCount,
      level_mismatch: levelMismatch,
      structural_status
    });

  } catch (error) {

    console.error("ERROR VALIDACIÓN:", error);

    res.status(500).json({
      error: error.message
    });

  }

});


app.post("/academic/director-decision", async (req, res) => {
  try {
    const {
      student_id,
      declared_grade,
      validated_grade,
      leveling_required,
      academic_status,
      active_tutor
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO academic_control
      (student_id, declared_grade, validated_grade, leveling_required, academic_status, active_tutor, director_decision_date)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      ON CONFLICT (student_id)
      DO UPDATE SET
        declared_grade = EXCLUDED.declared_grade,
        validated_grade = EXCLUDED.validated_grade,
        leveling_required = EXCLUDED.leveling_required,
        academic_status = EXCLUDED.academic_status,
        active_tutor = EXCLUDED.active_tutor,
        director_decision_date = NOW()
      RETURNING *;
      `,
      [
        student_id,
        declared_grade,
        validated_grade,
        leveling_required,
        academic_status,
        active_tutor
      ]
    );

    res.json({
      message: "Decisión del Director guardada correctamente",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("ERROR DIRECTOR DECISION:", error);
    res.status(500).json({ error: error.message });
  }
});



app.get("/academic/current-status/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;

    const result = await pool.query(
      "SELECT * FROM academic_control WHERE student_id = $1",
      [student_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "No existe control académico para este estudiante" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("ERROR CURRENT STATUS:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
DIRECTOR - CREAR ESTUDIANTE
INICIO ACADÉMICO
========================= */

app.post("/academic/create-student", async (req, res) => {
  try {

    const { full_name, email, age, declared_grade } = req.body;

    if (!full_name || !declared_grade) {
      return res.status(400).json({
        error: "full_name y declared_grade son obligatorios"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO students 
      (full_name, email, age, declared_grade, current_grade)
      VALUES ($1,$2,$3,$4,$4)
      RETURNING id, full_name, declared_grade
      `,
      [
        full_name,
        email || null,
        age || null,
        declared_grade
      ]
    );

    res.json({
      message: "Estudiante creado correctamente",
      student: result.rows[0]
    });

  } catch (error) {
    console.error("ERROR CREATE STUDENT:", error);
    res.status(500).json({ error: error.message });
  }
});


/* ===============================
DIRECTOR - ASIGNAR MATERIAS OFICIALES
Colombia por defecto
================================ */

app.post("/academic/assign/:student_id", async (req, res) => {
  try {

    const { student_id } = req.params;

    // 1️⃣ Verificar estudiante
    const student = await pool.query(
      "SELECT id, current_grade FROM students WHERE id = $1",
      [student_id]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    const grade = student.rows[0].current_grade;

    // 2️⃣ País por defecto Colombia (id = 1)
    const country_id = 1;

    // 3️⃣ Traer materias oficiales del país
    const subjects = await pool.query(
      `
      SELECT id 
      FROM academic_subjects_catalog
      WHERE country_id = $1
      `,
      [country_id]
    );

    // 4️⃣ Insertar materias si no existen
    for (let subject of subjects.rows) {
      await pool.query(
        `
        INSERT INTO student_subjects
        (student_id, subject_id, current_level)
        VALUES ($1,$2,$3)
        ON CONFLICT DO NOTHING
        `,
        [student_id, subject.id, grade]
      );
    }

    res.json({
      message: "Materias oficiales asignadas correctamente",
      student_id,
      total_subjects: subjects.rowCount
    });

  } catch (error) {
    console.error("ERROR ASSIGN:", error);
    res.status(500).json({ error: error.message });
  }
});


app.post("/academic/register-student", async (req, res) => {
  try {
    const {
      token,
      full_name,
      email,
      age,
      country,
      language,
      declared_grade
    } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token requerido" });
    }

    // 🔎 Verificar si email ya existe
    const existingStudent = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [email]
    );

    if (existingStudent.rows.length > 0) {
      return res.status(409).json({
        error: "Este correo ya está registrado en el sistema."
      });
    }

    // 🔎 Obtener country_id (asumimos que ya existe Colombia id=1)
    const countryResult = await pool.query(
      "SELECT id FROM academy_countries WHERE name = $1",
      [country]
    );

    if (countryResult.rows.length === 0) {
      return res.status(400).json({
        error: "País no válido en el sistema."
      });
    }

    const country_id = countryResult.rows[0].id;

    // ✅ Insertar estudiante
    await pool.query(
      `
      INSERT INTO students
      (full_name, email, age, declared_grade, current_grade, enrollment_date, active, country_id)
      VALUES ($1, $2, $3, $4, $4, NOW(), true, $5)
      `,
      [full_name, email, age, declared_grade, country_id]
    );

    res.json({
      success: true,
      message: "Estudiante registrado correctamente"
    });

  } catch (error) {
    console.error(error);

    // Si el error es por unique constraint
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Este correo ya está registrado."
      });
    }

    res.status(500).json({
      error: "Error interno registrando estudiante."
    });
  }
});

app.post("/director/assign-tutors", async (req, res) => {

  try {

    const { student_id, tutors } = req.body;

    if (!student_id || !Array.isArray(tutors)) {
      return res.status(400).send("Datos inválidos");
    }

    for (let tutor of tutors) {

      await pool.query(`
        INSERT INTO student_active_tutors (student_id, tutor_area)
        VALUES ($1,$2)
        ON CONFLICT DO NOTHING
      `, [student_id, tutor]);

    }

    res.send("Tutores asignados correctamente");

  } catch (error) {

    console.error(error);
    res.status(500).send("Error asignando tutores");

  }

});

async function enviarCorreoTutores(student_id, email, token) {

  const activeTutors = await pool.query(`
    SELECT tutor_area
    FROM student_active_tutors
    WHERE student_id = $1
  `, [student_id]);

  const botones = activeTutors.rows.map(t =>
    `
    <p>
      <a href="https://magic-bank-backend-production-713e.up.railway.app/tutor/${t.tutor_area}?token=${token}">
        Acceder Tutor ${t.tutor_area}
      </a>
    </p>
    `
  ).join("");

  await axios.post(
    "https://api.resend.com/emails",
    {
      from: "Director MagicBank <director@send.magicbank.org>",
      to: email,
      subject: "Asignación oficial de tutores",
      html: `
        <h2>🎓 Asignación Académica Oficial</h2>
        <p>Estos son tus tutores autorizados:</p>
        ${botones}
      `
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

}

app.get("/tutor/:area", async (req, res) => {

  try {

    const { area } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(403).send("Acceso restringido");
    }

    // 🔐 Hashear token recibido
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const tokenCheck = await pool.query(`
      SELECT email
      FROM access_tokens
      WHERE token = $1
      AND expires_at > NOW()
    `, [tokenHash]);

    if (!tokenCheck.rowCount) {
      return res.status(403).send("Token inválido");
    }

    const student = await pool.query(`
      SELECT id
      FROM students
      WHERE email = $1
    `, [tokenCheck.rows[0].email]);

    if (!student.rowCount) {
      return res.status(403).send("Estudiante no encontrado");
    }

    const student_id = student.rows[0].id;

    const authorized = await pool.query(`
      SELECT 1
      FROM student_active_tutors
      WHERE student_id = $1
      AND tutor_area = $2
    `, [student_id, area]);

    if (!authorized.rowCount) {
      return res.status(403).send("Tutor no autorizado");
    }

    const tutorUrl = TUTOR_GPTS[area];

    if (!tutorUrl) {
      return res.status(404).send("Tutor no existe");
    }

    res.redirect(tutorUrl);

  } catch (error) {

    console.error(error);
    res.status(500).send("Error accediendo tutor");

  }

});

/* =========================
DIRECTOR - REGISTRO INSTITUCIONAL
========================= */

app.post("/director/register-student", async (req, res) => {

  try {

    const {
      token,
      full_name,
      age,
      country,
      language,
      declared_grade
    } = req.body;

    if (!token || !full_name || !declared_grade) {
      return res.status(400).json({
        error: "Datos incompletos"
      });
    }

    // 🔐 Hashear token
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // 1️⃣ Buscar email asociado al token
    const access = await pool.query(`
      SELECT email
      FROM access_tokens
      WHERE token = $1
      AND expires_at > NOW()
    `, [tokenHash]);

    if (!access.rowCount) {
      return res.status(403).json({
        error: "Token inválido o expirado"
      });
    }

    const email = access.rows[0].email;

    // 2️⃣ Verificar si el estudiante ya existe
    const existingStudent = await pool.query(`
      SELECT id
      FROM students
      WHERE email = $1
    `, [email]);

    let student_id;

    if (!existingStudent.rowCount) {

      // 3️⃣ Crear nuevo estudiante
      const created = await pool.query(`
        INSERT INTO students
        (full_name, email, age, country, language, declared_grade, current_grade, academic_status)
        VALUES ($1,$2,$3,$4,$5,$6,$6,'active')
        RETURNING id
      `, [
        full_name,
        email,
        age || null,
        country || "No especificado",
        language || "Español",
        declared_grade
      ]);

      student_id = created.rows[0].id;

    } else {

      // 4️⃣ Si ya existe, actualizamos datos básicos
      student_id = existingStudent.rows[0].id;

      await pool.query(`
        UPDATE students
        SET
          full_name = $1,
          age = $2,
          country = $3,
          language = $4,
          declared_grade = $5,
          current_grade = $5
        WHERE id = $6
      `, [
        full_name,
        age || null,
        country || "No especificado",
        language || "Español",
        declared_grade,
        student_id
      ]);

    }

    res.json({
      message: "Registro académico completado correctamente",
      student_id
    });

  } catch (error) {

    console.error("ERROR REGISTER STUDENT:", error);

    res.status(500).json({
      error: "Error registrando estudiante"
    });

  }

});


app.post("/api/validate-token", async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        error: "Token y email son requeridos."
      });
    }

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

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Token inválido, expirado o no pertenece a este correo."
      });
    }

    res.json({
      success: true,
      email: result.rows[0].email,
      product: result.rows[0].product_name,
      expires_at: result.rows[0].expires_at
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error validando token."
    });
  }
});

app.post("/admin/fix-students-table", async (req, res) => {
  try {

    // 1️⃣ Crear tabla si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        age INTEGER NOT NULL,
        country TEXT NOT NULL,
        language TEXT NOT NULL,
        declared_grade TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2️⃣ Agregar UNIQUE si no existe
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'unique_student_email'
        ) THEN
          ALTER TABLE students
          ADD CONSTRAINT unique_student_email UNIQUE (email);
        END IF;
      END
      $$;
    `);

    res.json({
      success: true,
      message: "Tabla students verificada y corregida"
    });

  } catch (error) {
    console.error("ERROR FIX STUDENTS:", error);
    res.status(500).json({
      error: "Error corrigiendo tabla students",
      detail: error.message
    });
  }
});



app.get("/academic/dashboard", async (req, res) => {
  try {

    // 1️⃣ Total estudiantes activos
    const totalStudents = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM students
      WHERE active = true
    `);

    // 2️⃣ Estudiantes por grado
    const byGrade = await pool.query(`
      SELECT 
        COALESCE(current_grade, declared_grade, 'Sin definir') AS grade,
        COUNT(*)::int AS total
      FROM students
      WHERE active = true
      GROUP BY grade
      ORDER BY grade
    `);

    // 3️⃣ Estudiantes por país (sin JOIN para evitar errores)
    const byCountry = await pool.query(`
      SELECT 
        COALESCE(country_id::text, 'Sin definir') AS country,
        COUNT(*)::int AS total
      FROM students
      WHERE active = true
      GROUP BY country
      ORDER BY country
    `);

    // 4️⃣ Promedio académico por grado (si existen cierres)
    let averageByGrade = [];
    try {
      const avgQuery = await pool.query(`
        SELECT 
          grade_level,
          ROUND(AVG(final_score)::numeric, 2) AS average
        FROM academic_unit_closures
        GROUP BY grade_level
        ORDER BY grade_level
      `);
      averageByGrade = avgQuery.rows;
    } catch {
      averageByGrade = [];
    }

    // 5️⃣ Total unidades cerradas
    let totalUnits = 0;
    try {
      const unitsQuery = await pool.query(`
        SELECT COUNT(*)::int AS count
        FROM academic_unit_closures
      `);
      totalUnits = unitsQuery.rows[0].count;
    } catch {
      totalUnits = 0;
    }

    // 6️⃣ Tokens activos
    const activeTokens = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM access_tokens
      WHERE expires_at > NOW()
    `);

    // 7️⃣ Tokens próximos a vencer (30 días)
    const expiringSoon = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM access_tokens
      WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    `);

    res.json({
      success: true,
      generated_at: new Date(),
      total_students: totalStudents.rows[0].count,
      students_by_grade: byGrade.rows,
      students_by_country: byCountry.rows,
      average_score_by_grade: averageByGrade,
      total_units_closed: totalUnits,
      active_tokens: activeTokens.rows[0].count,
      expiring_soon: expiringSoon.rows[0].count
    });

  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
    res.status(500).json({
      success: false,
      error: "Error generando dashboard institucional"
    });
  }
});
app.get("/academic/student-history/:email", async (req, res) => {
  try {
    const { email } = req.params;

    // 1️⃣ Buscar estudiante
    const studentQuery = await pool.query(`
      SELECT id, full_name, email, age, current_grade, enrollment_date
      FROM students
      WHERE email = $1
      LIMIT 1
    `, [email]);

    if (studentQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Estudiante no encontrado"
      });
    }

    const student = studentQuery.rows[0];

    // 2️⃣ Buscar historial académico
    let units = [];
    let globalAverage = null;

    try {
      const historyQuery = await pool.query(`
        SELECT 
          area,
          unit_name,
          grade_level,
          final_score,
          performance_level,
          closed_at
        FROM academic_unit_closures
        WHERE student_id = $1
        ORDER BY closed_at DESC
      `, [student.id]);

      units = historyQuery.rows;

      if (units.length > 0) {
        const avg = units.reduce((sum, u) => sum + Number(u.final_score), 0) / units.length;
        globalAverage = Number(avg.toFixed(2));
      }

    } catch {
      units = [];
      globalAverage = null;
    }

    res.json({
      success: true,
      student,
      total_units: units.length,
      global_average: globalAverage,
      units
    });

  } catch (error) {
    console.error("HISTORY ERROR:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo historial académico"
    });
  }
});

app.post("/academic/certification-evaluation", async (req, res) => {

  const client = await pool.connect();

  try {

    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({
        error: "student_id requerido"
      });
    }

    await client.query("BEGIN");

    // 1️⃣ Verificar estudiante
    const student = await client.query(
      "SELECT id, full_name, current_grade FROM students WHERE id = $1",
      [student_id]
    );

    if (!student.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Estudiante no encontrado"
      });
    }

    // 2️⃣ Obtener materias
    const subjects = await client.query(`
      SELECT subject, progress_percentage
      FROM student_subject_progress
      WHERE student_id = $1
    `, [student_id]);

    if (!subjects.rowCount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "No existen materias registradas"
      });
    }

    let totalSubjects = subjects.rows.length;
    let completed = 0;

    for (let s of subjects.rows) {
      if (Number(s.progress_percentage) >= 100) {
        completed++;
      }
    }

    // 3️⃣ Evaluar graduación
    const graduationEligible = completed === totalSubjects;

    // 4️⃣ Calcular promedio académico
    const scores = await client.query(`
      SELECT final_score
      FROM academic_unit_closures
      WHERE student_id = $1
    `, [student_id]);

    let averageScore = null;

    if (scores.rowCount > 0) {
      const sum = scores.rows.reduce(
        (acc, s) => acc + Number(s.final_score),
        0
      );

      averageScore = Number(
        (sum / scores.rowCount).toFixed(2)
      );
    }

    // 5️⃣ Actualizar certificación
    if (graduationEligible) {

      await client.query(`
        UPDATE student_certification_path
        SET
          approved = true,
          certification_ready = true,
          certification_date = NOW(),
          readiness_level = 'graduado'
        WHERE student_id = $1
      `, [student_id]);

      await client.query(`
        UPDATE student_academic_status
        SET certification_ready = true
        WHERE student_id = $1
      `, [student_id]);

    }

    // 6️⃣ Crear expediente académico
    await client.query(`
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
      totalSubjects,
      completed,
      graduationEligible,
      averageScore
    ]);

    await client.query("COMMIT");

    res.json({
      success: true,
      student: student.rows[0].full_name,
      total_subjects: totalSubjects,
      completed_subjects: completed,
      graduation_eligible: graduationEligible,
      academic_average: averageScore
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error("CERTIFICATION ERROR:", error);

    res.status(500).json({
      error: "Error evaluando certificación",
      detail: error.message
    });

  } finally {

    client.release();

  }

});

app.get("/setup/install-academic-system", async (req, res) => {

  try {

    await pool.query(`

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INTEGER,
  country TEXT,
  language TEXT,
  current_grade INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_diagnostic (
  id SERIAL PRIMARY KEY,
  student_id INTEGER,
  diagnostic_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_subject_progress (
  id SERIAL PRIMARY KEY,
  student_id INTEGER,
  subject TEXT,
  progress_percentage INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS student_academic_status (
  id SERIAL PRIMARY KEY,
  student_id INTEGER,
  status TEXT DEFAULT 'activo',
  certification_ready BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS student_certification_path (
  id SERIAL PRIMARY KEY,
  student_id INTEGER,
  approved BOOLEAN DEFAULT false,
  certification_ready BOOLEAN DEFAULT false,
  certification_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_schedule_control (
  id SERIAL PRIMARY KEY,
  student_id INTEGER,
  subject TEXT,
  schedule JSONB
);

CREATE TABLE IF NOT EXISTS academic_unit_closures (
  id SERIAL PRIMARY KEY,
  student_id INTEGER,
  subject TEXT,
  final_score NUMERIC
);

CREATE TABLE IF NOT EXISTS academic_records (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  total_subjects INTEGER,
  completed_subjects INTEGER,
  graduation_eligible BOOLEAN,
  academic_average NUMERIC,
  generated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_certificates (
  id SERIAL PRIMARY KEY,
  student_id INTEGER,
  certificate_code VARCHAR(20) UNIQUE,
  student_name TEXT,
  program_name TEXT,
  academic_average NUMERIC,
  qr_code TEXT,
  issued_at TIMESTAMP DEFAULT NOW()
);

`);

    res.json({
      success: true,
      message: "Sistema académico MagicBank instalado correctamente"
    });

  } catch (error) {

    console.error("ERROR INSTALL ACADEMIC SYSTEM:", error);

    res.status(500).json({
      error: error.message
    });

  }

});
app.get("/academic/build-record/:studentId", async (req, res) => {

  try {

    const studentId = req.params.studentId;

    const progress = await pool.query(
      "SELECT * FROM student_subject_progress WHERE student_id=$1",
      [studentId]
    );

    const totalSubjects = progress.rows.length;

    let completedSubjects = 0;
    let totalScore = 0;

    progress.rows.forEach(p => {
      if (p.progress_percentage >= 100) {
        completedSubjects++;
        totalScore += 100;
      } else {
        totalScore += p.progress_percentage;
      }
    });

    const average =
      totalSubjects > 0 ? totalScore / totalSubjects : 0;

    const graduationEligible =
      completedSubjects >= totalSubjects && totalSubjects > 0;

    await pool.query(
      `
      INSERT INTO academic_records
      (student_id, total_subjects, completed_subjects, graduation_eligible, academic_average, generated_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
      `,
      [
        studentId,
        totalSubjects,
        completedSubjects,
        graduationEligible,
        average
      ]
    );

    res.json({
      success: true,
      studentId,
      totalSubjects,
      completedSubjects,
      graduationEligible,
      academicAverage: average
    });

  } catch (error) {

    console.error("ERROR BUILD RECORD:", error);

    res.status(500).json({
      error: error.message
    });

  }

});
app.get("/academic/generate-diploma/:studentId", async (req, res) => {

  try {

    const studentId = req.params.studentId;

    const student = await pool.query(
      "SELECT * FROM students WHERE id=$1",
      [studentId]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    const record = await pool.query(
      "SELECT * FROM academic_records WHERE student_id=$1 ORDER BY generated_at DESC LIMIT 1",
      [studentId]
    );

    if (record.rows.length === 0) {
      return res.status(400).json({
        error: "No existe expediente académico"
      });
    }

    const academic = record.rows[0];

    if (!academic.graduation_eligible) {
      return res.status(400).json({
        error: "El estudiante aún no cumple requisitos de graduación"
      });
    }

    const certificateCode =
      "MB-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    await pool.query(
      `
      INSERT INTO academic_certificates
      (student_id, certificate_code, student_name, program_name, academic_average)
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        studentId,
        certificateCode,
        student.rows[0].full_name,
        "Bachillerato MagicBank",
        academic.academic_average
      ]
    );

    res.json({
      success: true,
      message: "Diploma generado correctamente",
      certificateCode: certificateCode
    });

  } catch (error) {

    console.error("ERROR GENERATING DIPLOMA:", error);

    res.status(500).json({
      error: error.message
    });

  }

});

app.get("/verify-diploma/:code", async (req, res) => {

  try {

    const code = req.params.code;

    const diploma = await pool.query(
      "SELECT * FROM academic_certificates WHERE certificate_code=$1",
      [code]
    );

    if (diploma.rows.length === 0) {
      return res.status(404).json({
        valid: false,
        message: "Diploma no encontrado"
      });
    }

    res.json({
      valid: true,
      diploma: diploma.rows[0]
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});


import PDFDocument from "pdfkit";

app.get("/academic/generate-diploma-pdf/:code", async (req,res)=>{

try{

const { code } = req.params;

const result = await pool.query(
"SELECT * FROM academic_certificates WHERE certificate_code=$1",
[code]
);

if(result.rows.length===0){
return res.status(404).json({error:"Diploma no encontrado"});
}

const diploma = result.rows[0];

const doc = new PDFDocument();

res.setHeader("Content-Type","application/pdf");
res.setHeader(
"Content-Disposition",
`attachment; filename=diploma-${code}.pdf`
);

doc.pipe(res);

doc.fontSize(26).text("MagicBank University",{align:"center"});
doc.moveDown();

doc.fontSize(20).text("Diploma Oficial",{align:"center"});
doc.moveDown();

doc.fontSize(16).text(`Código de diploma: ${code}`,{align:"center"});
doc.moveDown();

doc.text(`Fecha de emisión: ${diploma.issued_at}`,{align:"center"});
doc.moveDown();

doc.text(
"Este diploma certifica que el estudiante ha completado exitosamente su programa académico.",
{align:"center"}
);

doc.moveDown();

const verifyURL =
`https://magic-bank-backend-production-713e.up.railway.app/verify-diploma/${code}`;

const qr = await QRCode.toDataURL(verifyURL);

const base64Data = qr.replace(/^data:image\/png;base64,/,"");
const imgBuffer = Buffer.from(base64Data,"base64");

doc.image(imgBuffer,{
fit:[150,150],
align:"center"
});

doc.moveDown();

doc.fontSize(10).text(
"Escanee el QR para verificar el diploma.",
{align:"center"}
);

doc.end();

}catch(err){

res.status(500).json({error:err.message})

}

});

app.get("/debug/graduate-student/:id", async (req,res)=>{

  const id = req.params.id;

  await pool.query(`
  UPDATE student_subject_progress
  SET progress_percentage = 100
  WHERE student_id = $1
  `,[id]);

  res.json({message:"materias completadas"});
});


import PDFDocument from "pdfkit";
import QRCode from "qrcode";

app.get("/academic/generate-diploma-luxury/:code", async (req,res)=>{
try{

const { code } = req.params;

const result = await pool.query(
"SELECT * FROM academic_certificates WHERE certificate_code=$1",
[code]
);

if(result.rows.length===0){
return res.status(404).json({error:"Diploma no encontrado"});
}

const diploma = result.rows[0];

// URL de verificación
const verifyURL = `https://magic-bank-backend-production-713e.up.railway.app/verify-diploma/${code}`;

// crear QR
const qr = await QRCode.toDataURL(verifyURL);
const base64Data = qr.replace(/^data:image\/png;base64,/,"");
const qrBuffer = Buffer.from(base64Data,"base64");

const doc = new PDFDocument({
size:"A4",
layout:"landscape",
margin:50
});

res.setHeader("Content-Type","application/pdf");
res.setHeader(
"Content-Disposition",
`attachment; filename=diploma-${code}.pdf`
);

doc.pipe(res);

// fondo elegante
doc.rect(0,0,doc.page.width,doc.page.height)
.fill("#0b0b0b");

// marco dorado
doc.lineWidth(8)
.strokeColor("#d4af37")
.rect(20,20,doc.page.width-40,doc.page.height-40)
.stroke();

// logo
doc.image("logo-mb.png", doc.page.width/2-70, 60, {
width:140
});

// título
doc.moveDown(6);

doc.fillColor("#d4af37")
.fontSize(38)
.text("MAGICBANK UNIVERSITY",{
align:"center"
});

doc.moveDown(0.5);

doc.fontSize(24)
.text("CERTIFICADO OFICIAL",{
align:"center"
});

// texto
doc.moveDown(2);

doc.fillColor("white")
.fontSize(18)
.text("Este certificado acredita que",{align:"center"});

doc.moveDown(1);

// nombre estudiante
doc.fontSize(34)
.fillColor("#d4af37")
.text(diploma.student_name || "Estudiante MagicBank",{
align:"center"
});

// programa
doc.moveDown(1);

doc.fontSize(18)
.fillColor("white")
.text(
`ha completado satisfactoriamente el programa académico de`,
{align:"center"}
);

doc.moveDown(0.5);

doc.fontSize(22)
.fillColor("#d4af37")
.text(diploma.program_name || "Programa Académico",{
align:"center"
});

doc.moveDown(2);

// datos académicos
doc.fontSize(14)
.fillColor("white")
.text(`Código del Diploma: ${code}`,{align:"center"});

doc.text(`Promedio Académico: ${diploma.academic_average || "—"}`,{
align:"center"
});

doc.text(`Fecha de emisión: ${diploma.issued_at}`,{
align:"center"
});

// QR
doc.image(qrBuffer, doc.page.width/2-60, doc.page.height-180,{
width:120
});

doc.moveDown(10);

doc.fontSize(12)
.fillColor("#d4af37")
.text("Escanee el QR para verificar la autenticidad del diploma.",{
align:"center"
});

// firma
doc.moveDown(2);

doc.fontSize(14)
.fillColor("white")
.text("Director Académico",{
align:"center"
});

doc.text("MagicBank University",{
align:"center"
});

doc.end();

}catch(err){
res.status(500).json({error:err.message})
}
});


/* =============================
START
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(`MagicBank backend running on port ${PORT}`);
});
