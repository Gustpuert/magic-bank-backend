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
 * Tiendanube redirige aquí con ?code=XXXX
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;

  // Validación mínima
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
    console.log("✅ ACCESS TOKEN OBTENIDO");

    /**
     * 2️⃣ Obtener datos de la tienda
     */
    const storeResponse = await axios.get(
      "https://api.tiendanube.com/v1/store",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": process.env.EMAIL_USER || "MagicBank"
        }
      }
    );

    const store = storeResponse.data;

    /**
     * 3️⃣ Datos finales de la tienda
     */
    const storeData = {
      store_id: store.id,
      name: store.name,
      email: store.email,
      domain: store.domain,
      access_token: accessToken
    };

    console.log("🏪 TIENDA CONECTADA CORRECTAMENTE:");
    console.log(storeData);

    /**
     * 👉 En el próximo paso:
     * guardar storeData en la base de datos
     */

    res
      .status(200)
      .send("Aplicación MagicBank instalada correctamente en Tiendanube");

  } catch (error) {
    console.error(
      "❌ OAuth Error:",
      error.response?.data || error.message
    );
    res.status(500).send("Error during OAuth process");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
