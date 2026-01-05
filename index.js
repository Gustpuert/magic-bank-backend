require("dotenv").config();

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

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
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    console.log("✅ TIENDANUBE INSTALADA CORRECTAMENTE");
    console.log("ACCESS TOKEN:", accessToken);

    /**
     * 2️⃣ Obtener datos de la tienda (store_id)
     */
    const storeResponse = await axios.get(
      "https://api.tiendanube.com/v1/store",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": process.env.TIENDANUBE_USER_AGENT || "magicbankia@gmail.com"
        }
      }
    );

    const storeData = storeResponse.data;

    console.log("🏪 STORE OBTENIDA");
    console.log("STORE ID:", storeData.id);
    console.log("STORE NAME:", storeData.name);
    console.log("STORE EMAIL:", storeData.email);

    /**
     * 3️⃣ AQUÍ es donde luego guardarás en BD:
     * - storeData.id
     * - accessToken
     *
     * Por ahora solo lo confirmamos en logs (correcto para esta etapa)
     */

    res
      .status(200)
      .send("Aplicación MagicBank instalada correctamente en Tiendanube");

  } catch (error) {
    console.error(
      "❌ OAuth Error:",
      error.response?.data || error.message
    );
    res.status(500).send("Error during Tiendanube OAuth process");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
