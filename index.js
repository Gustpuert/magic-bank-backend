const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/**
 * CALLBACK DE OAUTH TIENDA NUBE
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    console.error("Callback recibido sin code:", req.query);
    return res.status(400).send("Missing code");
  }

  try {
    // Intercambiar code por access_token
    const tokenResponse = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const { access_token } = tokenResponse.data;

    console.log("ACCESS TOKEN OBTENIDO:", access_token);

    // Obtener datos de la tienda (incluye store_id)
    const storeResponse = await axios.get(
      "https://api.tiendanube.com/v1/my/store",
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": "MagicBank App (soporte@magicbank.org)"
        }
      }
    );

    const store = storeResponse.data;

    console.log("STORE ID:", store.id);
    console.log("STORE NAME:", store.name);

    res.status(200).send("App instalada correctamente en Tienda Nube");

  } catch (error) {
    console.error(
      "OAuth error:",
      error.response?.data || error.message
    );
    res.status(500).send("OAuth failed");
  }
});

app.listen(PORT, () => {
  console.log(`MagicBank Backend running on port ${PORT}`);
});
