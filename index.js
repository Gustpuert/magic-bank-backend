require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/**
 * Middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Postgres connection
 * Railway inyecta DATABASE_URL
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
 * OAuth Callback Tiendanube
 * Se usa SOLO cuando se instala la app
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
    const storeId = tokenResponse.data.user_id; // ID REAL DE LA TIENDA

    // Guardar o actualizar token
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
  } catch (error) {
    console.error("OAuth error:", error.response?.data || error.message);
    res.status(500).send("OAuth error");
  }
});

/**
 * GET /store
 * Devuelve información de la tienda usando el token guardado
 */
app.get("/store", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT store_id, access_token
      FROM tiendanube_stores
      ORDER BY created_at DESC
      LIMIT 1
      `
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No store found in database" });
    }

    const { store_id, access_token } = result.rows[0];

    const storeResponse = await axios.get(
      `https://api.tiendanube.com/v1/${store_id}/store`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank (contacto@magicbank.com)",
        },
      }
    );

    res.json(storeResponse.data);
  } catch (error) {
    console.error("Store fetch error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch store data" });
  }
});

/**
 * Webhook Tiendanube - Orden pagada
 * ESTE es el corazón de la automatización
 */
app.post("/webhooks/order-paid", async (req, res) => {
  try {
    const payload = req.body;

    console.log("📦 Webhook recibido: ORDEN PAGADA");
    console.log(JSON.stringify(payload, null, 2));

    /**
     * Próximos pasos (luego):
     * - Validar que esté pagada
     * - Identificar producto / curso
     * - Crear acceso al curso
     * - Asignar tutor IA
     */

    // Respuesta obligatoria a Tiendanube
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    res.status(500).json({ error: "Webhook error" });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
