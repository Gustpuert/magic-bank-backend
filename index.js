require("dotenv").config();

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/**
 * =========================
 * MIDDLEWARE
 * =========================
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * =========================
 * POSTGRES (Railway)
 * =========================
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/**
 * =========================
 * PRODUCTOS MAGICBANK
 * =========================
 */

/**
 * UNIVERSITY – FACULTADES
 */
const UNIVERSITY_PRODUCTS = {
  315058790: { name: "Administración y Negocios", type: "university" },
  315061240: { name: "Derecho", type: "university" },
  315061516: { name: "Contaduría", type: "university" },
  315062639: { name: "Marketing", type: "university" },
  315062968: { name: "Desarrollo de Software", type: "university" },
};

/**
 * ACADEMY – CURSOS
 */
const ACADEMY_PRODUCTS = {
  310596602: { name: "Cocina", type: "academy" },
  310593279: { name: "Nutrición Inteligente", type: "academy" },
  310561138: { name: "ChatGPT Avanzado", type: "academy" },
  310587272: { name: "Inglés", type: "academy" },
  315067695: { name: "Portugués", type: "academy" },
  310589317: { name: "Francés", type: "academy" },
  315067943: { name: "Italiano", type: "academy" },
  315067066: { name: "Alemán", type: "academy" },
  315067368: { name: "Chino", type: "academy" },
  314360954: { name: "Artes y Oficios", type: "academy" },
  308900626: { name: "Pensiones Mágicas", type: "academy" },
};

/**
 * FÁBRICA DE TUTORES
 */
const FACTORY_PRODUCTS = {
  316681661: { name: "TAP Salud", type: "factory" },
  316683199: { name: "TAP Educación", type: "factory" },
  316683598: { name: "TAP Administración Pública", type: "factory" },
  316682295: { name: "TAP Derecho", type: "factory" },
  316682798: { name: "TAP Ingeniería", type: "factory" },
  316763604: { name: "TAP Empresas", type: "factory" },
  316684646: { name: "SuperTraductor", type: "factory" },
  316685090: { name: "BienestarTutor Pro", type: "factory" },
  316685729: { name: "MagicBank Council", type: "factory" },
  316686073: { name: "Sensei", type: "factory" },
  316193327: { name: "Tutor Personalizado", type: "factory" },
};

/**
 * =========================
 * OAUTH CALLBACK (SOLO INSTALACIÓN)
 * =========================
 */
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
      VALUES ($1, $2)
      ON CONFLICT (store_id)
      DO UPDATE SET access_token = EXCLUDED.access_token
      `,
      [storeId, accessToken]
    );

    res.send("MagicBank instalada correctamente");
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth error");
  }
});

/**
 * =========================
 * CREAR TOKEN DE ACCESO (POST-PAGO)
 * =========================
 */
app.post("/access/create", async (req, res) => {
  const { product_id, user_email } = req.body;

  const product =
    UNIVERSITY_PRODUCTS[product_id] ||
    ACADEMY_PRODUCTS[product_id] ||
    FACTORY_PRODUCTS[product_id];

  if (!product) {
    return res.status(400).json({ error: "Producto no reconocido" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1); // membresía mensual

  await pool.query(
    `
    INSERT INTO user_access
    (access_token, product_id, product_name, product_type, email, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      token,
      product_id,
      product.name,
      product.type,
      user_email,
      expiresAt,
    ]
  );

  res.json({
    access_link: `https://magicbank.org/access/${token}`,
    product: product.name,
  });
});

/**
 * =========================
 * VALIDAR ACCESO (TOKEN ÚNICO)
 * =========================
 */
app.get("/access/:token", async (req, res) => {
  const { token } = req.params;

  const result = await pool.query(
    `SELECT * FROM user_access WHERE access_token = $1`,
    [token]
  );

  if (result.rows.length === 0)
    return res.status(403).send("Acceso inválido");

  const access = result.rows[0];

  if (new Date(access.expires_at) < new Date())
    return res.status(403).send("Acceso vencido");

  if (access.session_active)
    return res.status(403).send("Acceso en uso en otro dispositivo");

  await pool.query(
    `
    UPDATE user_access
    SET session_active = true, session_started_at = NOW()
    WHERE id = $1
    `,
    [access.id]
  );

  let redirect = "";

  if (access.product_type === "university")
    redirect = "https://gustpuert.github.io/university.magicbank.org/";

  if (access.product_type === "academy")
    redirect = "https://academy.magicbank.org";

  if (access.product_type === "factory")
    redirect = "https://magicbank.org/fabrica-de-tutores.html";

  res.redirect(redirect);
});

/**
 * =========================
 * START SERVER
 * =========================
 */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
