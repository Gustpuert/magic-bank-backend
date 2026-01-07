require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   DATABASE (Railway Postgres)
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

/* =========================
   OAUTH CALLBACK (solo instalación App)
========================= */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenResponse = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const accessToken = tokenResponse.data.access_token;
    const storeId = tokenResponse.data.user_id;

    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1,$2)
      ON CONFLICT (store_id)
      DO UPDATE SET access_token = EXCLUDED.access_token
      `,
      [storeId, accessToken]
    );

    res.send("MagicBank App instalada correctamente");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("OAuth error");
  }
});

/* =========================
   PRODUCT MAP (FUENTE DE VERDAD)
========================= */
const PRODUCTS = {
  /* ===== ACADEMY ===== */
  310596602: { type: "academy", name: "Cocina" },
  310593279: { type: "academy", name: "Nutrición Inteligente" },
  310561138: { type: "academy", name: "ChatGPT Avanzado" },
  310587272: { type: "academy", name: "Inglés" },
  310589317: { type: "academy", name: "Francés" },
  315067695: { type: "academy", name: "Portugués" },
  315067943: { type: "academy", name: "Italiano" },
  315067066: { type: "academy", name: "Alemán" },
  315067368: { type: "academy", name: "Chino" },
  314360954: { type: "academy", name: "Artes y Oficios" },

  /* ===== UNIVERSITY ===== */
  315058790: { type: "university", name: "Administración y Negocios" },
  315062639: { type: "university", name: "Marketing" },
  315061516: { type: "university", name: "Contaduría" },
  315061240: { type: "university", name: "Derecho" },
  315062968: { type: "university", name: "Desarrollo de Software" },

  /* ===== FÁBRICA DE TUTORES ===== */
  316763604: { type: "tutor", name: "TAP Empresas" },
  316682295: { type: "tutor", name: "TAP Derecho" },
  316683598: { type: "tutor", name: "TAP Administración Pública" },
  316681661: { type: "tutor", name: "TAP Salud" },
  316682798: { type: "tutor", name: "TAP Ingeniería" },
  316683199: { type: "tutor", name: "TAP Educación" },
  316686073: { type: "tutor", name: "Sensei" },
  316684646: { type: "tutor", name: "SuperTraductor" },
  316685090: { type: "tutor", name: "BienestarTutor Pro" },
  316685729: { type: "tutor", name: "MagicBank Council" },
  316193327: { type: "tutor", name: "Tutor Personalizado" },
};

/* =========================
   ORDER PROCESSING (MANUAL CALL)
========================= */
app.post("/process-order", async (req, res) => {
  const { email, product_id } = req.body;

  if (!email || !product_id)
    return res.status(400).json({ error: "email y product_id requeridos" });

  const product = PRODUCTS[product_id];
  if (!product)
    return res.status(404).json({ error: "Producto no reconocido" });

  try {
    if (product.type === "academy") {
      await pool.query(
        `
        INSERT INTO academy_access (email, course_id, course_name)
        VALUES ($1,$2,$3)
        `,
        [email, product_id, product.name]
      );
    }

    if (product.type === "university") {
      await pool.query(
        `
        INSERT INTO university_access (email, faculty_id, faculty_name)
        VALUES ($1,$2,$3)
        `,
        [email, product_id, product.name]
      );
    }

    if (product.type === "tutor") {
      await pool.query(
        `
        INSERT INTO tutor_factory_access (email, tutor_id, tutor_name)
        VALUES ($1,$2,$3)
        `,
        [email, product_id, product.name]
      );
    }

    res.json({
      status: "OK",
      activated: product,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Activation error" });
  }
});

/* =========================
   ACCESS CHECK ENDPOINTS
========================= */
app.get("/access/all", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  const academy = await pool.query(
    `SELECT course_name FROM academy_access WHERE email=$1`,
    [email]
  );
  const university = await pool.query(
    `SELECT faculty_name FROM university_access WHERE email=$1`,
    [email]
  );
  const tutors = await pool.query(
    `SELECT tutor_name FROM tutor_factory_access WHERE email=$1`,
    [email]
  );

  res.json({
    academy: academy.rows,
    university: university.rows,
    tutors: tutors.rows,
  });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
