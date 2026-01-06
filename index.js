require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();

// Railway SIEMPRE inyecta PORT
const PORT = process.env.PORT || 8080;

// PostgreSQL connection (Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/**
 * Ensure table exists (runs once safely)
 */
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tiendanube_stores (
      id SERIAL PRIMARY KEY,
      store_id VARCHAR(255),
      access_token TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
  `);
}

// Create table on startup
ensureTable()
  .then(() => console.log("✅ Table tiendanube_stores ready"))
  .catch((err) => console.error("❌ Table init error", err));

/**
 * OAuth Callback Tiendanube / Nuvemshop
 * Tiendanube envía: ?code=XXXX&store_id=XXXX
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code, store_id } = req.query;

  if (!code) {
    console.error("❌ Missing authorization code");
    return res.status(400).send("Missing authorization code");
  }

  try {
    // Exchange code for access token
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
    console.log("ACCESS TOKEN:", accessToken);

    // Save token in database
    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1, $2)
      `,
      [store_id || null, accessToken]
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
 * Start server
 */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
