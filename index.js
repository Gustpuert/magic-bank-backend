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
 * Sirve para verificar que el backend está vivo
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/**
 * OAuth Callback Tiendanube / Nuvemshop
 * Tiendanube envía: ?code=XXXX&store_id=YYYY
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code, store_id } = req.query;

  if (!code || !store_id) {
    return res.status(400).send("Missing code or store_id");
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
    console.log("✅ TIENDANUBE INSTALADA");
    console.log("STORE ID:", store_id);
    console.log("ACCESS TOKEN:", accessToken);

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
