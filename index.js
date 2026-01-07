require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

/* =========================
   PostgreSQL
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* =========================
   PRODUCTOS
========================= */
const PRODUCTS_MAP = {
  // ===== ACADEMY =====
  315067943: { type: "academy", name: "Curso de Italiano" },
  315067695: { type: "academy", name: "Curso de Portugués" },
  315067368: { type: "academy", name: "Curso de Chino" },
  315067066: { type: "academy", name: "Curso de Alemán" },
  310587272: { type: "academy", name: "Curso de Inglés" },
  310589317: { type: "academy", name: "Curso de Francés" },
  310596602: { type: "academy", name: "Curso de Cocina" },
  310593279: { type: "academy", name: "Curso de Nutrición Inteligente" },
  310561138: { type: "academy", name: "Curso Avanzado de ChatGPT" },
  314360954: { type: "academy", name: "Artes y Oficios" },
  310401409: { type: "academy", name: "Curso Personalizado" },

  // ===== UNIVERSITY =====
  315062968: { type: "university", name: "Facultad de Desarrollo de Software" },
  315062639: { type: "university", name: "Facultad de Marketing" },
  315061516: { type: "university", name: "Facultad de Contaduría" },
  315061240: { type: "university", name: "Facultad de Derecho" },
  315058790: { type: "university", name: "Facultad de Administración y Negocios" },

  // ===== FÁBRICA DE TUTORES =====
  316763604: { type: "tutor_factory", name: "TAP Empresas" },
  316682295: { type: "tutor_factory", name: "TAP Derecho" },
  316683598: { type: "tutor_factory", name: "TAP Administración Pública" },
  316681661: { type: "tutor_factory", name: "TAP Salud" },
  316682798: { type: "tutor_factory", name: "TAP Ingeniería" },
  316683199: { type: "tutor_factory", name: "TAP Educación" },
  316686073: { type: "tutor_factory", name: "Sensei" },
  316684646: { type: "tutor_factory", name: "Supertraductor" },
  316685090: { type: "tutor_factory", name: "BienestarTutor Pro" },
  316685729: { type: "tutor_factory", name: "MagicBank Council" },
  316193327: { type: "tutor_factory", name: "Tutores Personalizados" }
};

/* =========================
   CREACIÓN DE TABLAS
========================= */
async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      order_id BIGINT,
      product_id BIGINT,
      product_type TEXT,
      product_name TEXT,
      customer_email TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(order_id, product_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS academy_access (
      id SERIAL PRIMARY KEY,
      email TEXT,
      course_id BIGINT,
      course_name TEXT,
      activated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(email, course_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS university_access (
      id SERIAL PRIMARY KEY,
      email TEXT,
      faculty_id BIGINT,
      faculty_name TEXT,
      activated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(email, faculty_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tutor_factory_access (
      id SERIAL PRIMARY KEY,
      email TEXT,
      tutor_id BIGINT,
      tutor_name TEXT,
      activated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(email, tutor_id)
    );
  `);

  console.log("✅ Tablas verificadas / creadas correctamente");
}

/* =========================
   ACTIVADORES
========================= */
async function activateAcademy(email, id, name) {
  await pool.query(
    `INSERT INTO academy_access (email, course_id, course_name)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [email, id, name]
  );
}

async function activateUniversity(email, id, name) {
  await pool.query(
    `INSERT INTO university_access (email, faculty_id, faculty_name)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [email, id, name]
  );
}

async function activateTutorFactory(email, id, name) {
  await pool.query(
    `INSERT INTO tutor_factory_access (email, tutor_id, tutor_name)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [email, id, name]
  );
}

/* =========================
   WEBHOOK TIENDANUBE
========================= */
app.post("/webhooks/order-paid", async (req, res) => {
  try {
    const order = req.body;
    const orderId = order.id;
    const email = order.customer?.email;
    if (!email) return res.sendStatus(200);

    for (const item of order.products) {
      const map = PRODUCTS_MAP[item.product_id];
      if (!map) continue;

      await pool.query(
        `INSERT INTO enrollments
         (order_id, product_id, product_type, product_name, customer_email)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT DO NOTHING`,
        [orderId, item.product_id, map.type, map.name, email]
      );

      if (map.type === "academy")
        await activateAcademy(email, item.product_id, map.name);

      if (map.type === "university")
        await activateUniversity(email, item.product_id, map.name);

      if (map.type === "tutor_factory")
        await activateTutorFactory(email, item.product_id, map.name);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.sendStatus(500);
  }
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 8080;

app.listen(PORT, async () => {
  await createTables();
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
