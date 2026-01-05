require("dotenv").config();

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Conexión a Postgres (Railway)
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
 * OAuth Callback Tiendanube
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    console.error("❌ Missing authorization code");
    return res.status(400).send("Missing authorization code");
  }

  try {
    /**
     * 1️⃣ Intercambiar code por access_token
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
        headers: { "Content-Type": "application/json" }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    console.log("✅ TIENDANUBE INSTALADA");
    console.log("ACCESS TOKEN:", accessToken);

    /**
     * 2️⃣ Guardar token en Postgres
     */
    await pool.query(
      "INSERT INTO tiendanube_stores (access_token) VALUES ($1)",
      [accessToken]
    );

    console.log("💾 Token guardado en la base de datos");

    res
      .status(200)
      .send("Aplicación MagicBank instalada correctamente");

  } catch (error) {
    console.error("❌ OAuth Error:", error.response?.data || error.message);
    res.status(500).send("Error en instalación");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
