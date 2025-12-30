require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Health check
 * Sirve para comprobar que el backend está vivo
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/**
 * Callback OAuth Tiendanube / Nuvemshop
 * IMPORTANTE:
 * - Tiendanube envía `code` y `user_id`
 * - `user_id` ES el ID de la tienda
 */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code, user_id } = req.query;

  if (!code || !user_id) {
    return res.status(400).send("Missing code or user_id");
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

    // LOGS CLAVE (confirman que todo funciona)
    console.log("STORE USER ID:", user_id);
    console.log("ACCESS TOKEN:", accessToken);

    // Aquí luego puedes guardar en DB:
    // store_id = user_id
    // access_token = accessToken

    res.status(200).send("App instalada correctamente en MagicBank");

  } catch (error) {
    console.error(
      "OAuth Error:",
      error.response?.data || error.message
    );
    res.status(500).send("Error exchanging code for token");
  }
});

app.listen(PORT, () => {
  console.log(`MagicBank Backend running on port ${PORT}`);
});
