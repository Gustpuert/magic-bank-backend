require("dotenv").config();

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Postgres connection (Railway)
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/**
 * OAuth Callback Tiendanube / Nuvemshop
 * Tiendanube envía: ?code=XXXX
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    console.error("❌ Missing authorization code");
    return res.status(400).send("Missing authorization code");
  }

  try {
    /**
     * Intercambiar code por access_token
     */
    const tokenResponse = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    console.log("✅ TIENDANUBE INSTALADA CORRECTAMENTE");
    console.log("ACCESS TOKEN:", accessToken);

    /**
     * Guardar token en base de datos
     */
    await pool.query(
      `
      INSERT INTO tiendanube_stores (access_token)
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
 * DEBUG — Ver tokens guardados (solo prueba)
 */
app.get("/debug/tiendanube/tokens", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, access_token, created_at FROM tiendanube_stores ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("❌ DB Error:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
