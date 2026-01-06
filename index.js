require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/**
 * Middlewares
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * PostgreSQL connection (Railway)
 * Usa DATABASE_URL que Railway inyecta automáticamente
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/**
 * OAuth Callback Tiendanube / Nuvemshop
 * Se ejecuta SOLO cuando la app se instala
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code, store_id } = req.query;

  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  try {
    // 1. Intercambiar code por access_token
    const tokenResponse = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 2. Guardar token en la tabla EXISTENTE
    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1, $2)
      ON CONFLICT (store_id)
      DO UPDATE SET access_token = EXCLUDED.access_token
      `,
      [store_id || "unknown", accessToken]
    );

    console.log("✅ Access token guardado en Postgres");

    res
      .status(200)
      .send("MagicBank instalada correctamente. Token guardado.");
  } catch (error) {
    console.error(
      "❌ OAuth Error:",
      error.response?.data || error.message
    );
    res.status(500).send("Error during OAuth process");
  }
});

/**
 * Endpoint de prueba:
 * Obtiene el último access_token guardado
 */
app.get("/debug/token", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT store_id, access_token, created_at
      FROM tiendanube_stores
      ORDER BY created_at DESC
      LIMIT 1
      `
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No store found in database" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ DB Error:", error.message);
    res.status(500).json({ error: "Failed to fetch store data" });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
