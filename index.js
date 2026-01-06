require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();

// Railway siempre inyecta PORT
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * PostgreSQL Pool (Railway)
 * DATABASE_URL debe estar en Variables de Entorno
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
 * Recibe: ?code=XXXX
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    console.error("❌ Missing authorization code");
    return res.status(400).send("Missing authorization code");
  }

  try {
    // Intercambio code → access_token
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

    console.log("✅ TIENDANUBE INSTALADA CORRECTAMENTE");
    console.log("ACCESS TOKEN RECIBIDO");

    // Guardar access_token en Postgres
    await pool.query(
      `
      INSERT INTO tiendanube_tokens (access_token)
      VALUES ($1)
      `,
      [accessToken]
    );

    res
      .status(200)
      .send("Aplicación MagicBank instalada correctamente en Tiendanube");
  } catch (error) {
    console.error(
      "❌ OAuth Error:",
      error.response?.data || error.message
    );
    res.status(500).send("Error exchanging code for token");
  }
});

/**
 * TEST REAL — Obtener información de la tienda
 * CONFIRMA que el access_token sirve
 */
app.get("/tiendanube/store", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT access_token FROM tiendanube_tokens ORDER BY created_at DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No access token found" });
    }

    const accessToken = result.rows[0].access_token;

    const response = await axios.get(
      "https://api.tiendanube.com/v1/my/store",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "MagicBank App (magicbankia@gmail.com)",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "❌ Error fetching store data:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch store data" });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
