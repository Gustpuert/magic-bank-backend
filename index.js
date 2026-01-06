require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Health check
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

/**
 * OAuth callback Tiendanube
 * ESTE ENDPOINT ES CLAVE
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code, store_id } = req.query;

  if (!code || !store_id) {
    return res.status(400).json({ error: "Missing code or store_id" });
  }

  try {
    // Intercambio code → access_token
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

    // Guardar o actualizar en DB
    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1, $2)
      ON CONFLICT (store_id)
      DO UPDATE SET access_token = EXCLUDED.access_token
      `,
      [store_id, accessToken]
    );

    res.send("✅ MagicBank autorizado y token guardado");
  } catch (error) {
    console.error("OAuth error:", error.response?.data || error.message);
    res.status(500).json({ error: "OAuth failed" });
  }
});

/**
 * Debug: ver si hay token guardado
 */
app.get("/debug/token", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT store_id, access_token, created_at
       FROM tiendanube_stores
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ error: "No store found in database" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
