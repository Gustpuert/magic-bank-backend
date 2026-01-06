require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/**
 * PostgreSQL connection (Railway)
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

/**
 * Middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/**
 * OAuth Callback – Tiendanube / Nuvemshop
 * Recibe ?code=XXXX
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    console.error("❌ Missing authorization code");
    return res.status(400).send("Missing authorization code");
  }

  try {
    /**
     * 1️⃣ Exchange code for access token
     */
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

    const { access_token, user_id } = tokenResponse.data;

    console.log("✅ TIENDANUBE INSTALADA CORRECTAMENTE");
    console.log("STORE ID:", user_id);
    console.log("ACCESS TOKEN:", access_token);

    /**
     * 2️⃣ Save token in Postgres (UPSERT)
     * No duplica tiendas
     */
    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1, $2)
      ON CONFLICT (store_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        created_at = NOW();
      `,
      [user_id.toString(), access_token]
    );

    /**
     * 3️⃣ Final response
     */
    res
      .status(200)
      .send("Aplicación MagicBank instalada correctamente");

  } catch (error) {
    console.error(
      "❌ OAuth Error:",
      error.response?.data || error.message
    );
    res.status(500).send("OAuth error");
  }
});

/**
 * Endpoint para verificar tienda instalada (opcional pero útil)
 */
app.get("/stores/:store_id", async (req, res) => {
  const { store_id } = req.params;

  try {
    const result = await pool.query(
      "SELECT store_id, created_at FROM tiendanube_stores WHERE store_id = $1",
      [store_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ installed: false });
    }

    res.json({
      installed: true,
      store: result.rows[0],
    });
  } catch (error) {
    console.error("❌ DB Error:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
