require("dotenv").config();

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

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

  // 🔥 CORRECCIÓN CLAVE:
  // NO se exige store_id porque OAuth no lo garantiza
  if (!code) {
    console.error("❌ Missing authorization code");
    return res.status(400).send("Missing authorization code");
  }

  try {
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

    // LOGS DE CONFIRMACIÓN
    console.log("✅ TIENDANUBE INSTALADA CORRECTAMENTE");
    console.log("ACCESS TOKEN:", accessToken);

    /**
     * 👉 Aquí luego puedes:
     * - Consultar la API /store con el accessToken
     * - Obtener store_id, nombre, email, etc.
     * - Guardar todo en tu base de datos
     */

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

app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
