require("dotenv").config();

const express = require("express");
const axios = require("axios");
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
 * POSTGRES CONNECTION
 * Railway inyecta DATABASE_URL
 * =========================
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * =========================
 * CATÁLOGO OFICIAL
 * FÁBRICA DE TUTORES MAGICBANK
 * =========================
 * ⚠️ FUENTE CANÓNICA
 * ⚠️ NO MODIFICAR IDs SIN CONTROL
 */
const FABRICA_TUTORES = {
  316763604: "TAP Empresas",
  316682295: "TAP Derecho",
  316683598: "TAP Administración Pública",
  316681661: "TAP Salud",
  316682798: "TAP Ingeniería",
  316683199: "TAP Educación",
  316686073: "Sensei",
  316684646: "Supertraductor",
  316685090: "BienestarTutor Pro",
  316685729: "MagicBank Council",
  316193327: "Tutores Personalizados",
};

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
 * OAUTH CALLBACK TIENDANUBE
 * ⚠️ SOLO SE USA AL INSTALAR LA APP
 * =========================
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  try {
    const tokenResponse = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
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

    res.send("MagicBank instalada correctamente en Tiendanube");
  } catch (error) {
    console.error("OAuth error:", error.response?.data || error.message);
    res.status(500).send("OAuth error");
  }
});

/**
 * =========================
 * ENDPOINT DE CONSULTA LOCAL
 * CATÁLOGO FÁBRICA DE TUTORES
 * =========================
 * 👉 SOLO PARA VERIFICACIÓN
 * 👉 NO ES AUTOMATIZACIÓN AÚN
 */
app.get("/catalogo/fabrica-tutores", (req, res) => {
  res.json({
    total: Object.keys(FABRICA_TUTORES).length,
    tutores: FABRICA_TUTORES,
  });
});

/**
 * =========================
 * START SERVER
 * =========================
 */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
