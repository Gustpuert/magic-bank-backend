// index.js
require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// =========================
// CONFIG
// =========================
const PORT = process.env.PORT || 8080;

// PostgreSQL (Railway usa DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway")
    ? { rejectUnauthorized: false }
    : false,
});

// =========================
// DB INIT (solo una vez)
// =========================
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS academy_enrollments (
        id SERIAL PRIMARY KEY,
        order_id BIGINT NOT NULL,
        product_id BIGINT NOT NULL,
        product_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(order_id, product_id)
      );
    `);

    console.log("✅ Tablas verificadas / creadas correctamente");
  } catch (err) {
    console.error("❌ Error creando tablas:", err.message);
  } finally {
    client.release();
  }
}

// =========================
// HEALTHCHECK
// =========================
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "MagicBank Backend",
    timestamp: new Date().toISOString(),
  });
});

// =========================
// ENDPOINT PRINCIPAL (manual / webhook)
// =========================
app.post("/academy/process-order", async (req, res) => {
  const { order_id, product_id, product_name, customer_email } = req.body;

  if (!order_id || !product_id || !product_name || !customer_email) {
    return res.status(400).json({
      error: "Faltan datos obligatorios",
    });
  }

  try {
    const query = `
      INSERT INTO academy_enrollments
      (order_id, product_id, product_name, customer_email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (order_id, product_id) DO NOTHING
      RETURNING id;
    `;

    const values = [
      order_id,
      product_id,
      product_name,
      customer_email,
    ];

    const result = await pool.query(query, values);

    return res.json({
      status: "ok",
      enrollment_created: result.rowCount === 1,
    });
  } catch (err) {
    console.error("❌ Error procesando orden:", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
});

// =========================
// START SERVER
// =========================
(async () => {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 MagicBank Backend running on port ${PORT}`);
  });
})();
