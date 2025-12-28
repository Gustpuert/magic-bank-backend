import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();

/* =========================
   CONFIGURACIÓN GENERAL
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

const {
  TIENDANUBE_CLIENT_ID,
  TIENDANUBE_CLIENT_SECRET,
  TIENDANUBE_REDIRECT_URI
} = process.env;

/* =========================
   HEALTH CHECK (RAILWAY)
========================= */

app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/* =========================
   OAUTH - INICIO INSTALACIÓN
========================= */
/*
  Esta URL es la que usa Tiendanube
  cuando instalas la app en la tienda real
*/

app.get("/tiendanube/auth", (req, res) => {
  const { store_id } = req.query;

  if (!store_id) {
    return res.status(400).send("Missing store_id");
  }

  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = `https://www.tiendanube.com/apps/authorize` +
    `?client_id=${TIENDANUBE_CLIENT_ID}` +
    `&store_id=${store_id}` +
    `&redirect_uri=${encodeURIComponent(TIENDANUBE_REDIRECT_URI)}` +
    `&state=${state}`;

  console.log("➡️ Redirigiendo a Tiendanube:", authUrl);
  res.redirect(authUrl);
});

/* =========================
   OAUTH - CALLBACK
========================= */

app.get("/tiendanube/callback", async (req, res) => {
  const { code, store_id } = req.query;

  if (!code || !store_id) {
    return res.status(400).send("Missing code or store_id");
  }

  try {
    const response = await fetch(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: TIENDANUBE_CLIENT_ID,
          client_secret: TIENDANUBE_CLIENT_SECRET,
          grant_type: "authorization_code",
          code
        })
      }
    );

    const data = await response.json();

    console.log("✅ ACCESS TOKEN GENERADO");
    console.log(data);

    // 👉 AQUÍ luego guardas access_token + store_id en DB

    res.send("Aplicación instalada correctamente. Ya puedes cerrar esta ventana.");

  } catch (error) {
    console.error("❌ Error OAuth:", error);
    res.status(500).send("OAuth error");
  }
});

/* =========================
   WEBHOOKS OBLIGATORIOS
========================= */

// Store redact
app.post("/webhooks/store/redact", (req, res) => {
  console.log("🧹 Store redact:", req.body);
  res.sendStatus(200);
});

// Customer redact
app.post("/webhooks/customers/redact", (req, res) => {
  console.log("🧹 Customer redact:", req.body);
  res.sendStatus(200);
});

// Customer data request
app.post("/webhooks/customers/data_request", (req, res) => {
  console.log("📄 Customer data request:", req.body);
  res.sendStatus(200);
});

/* =========================
   SERVER START (CLAVE)
========================= */

app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend corriendo en puerto ${PORT}`);
});
