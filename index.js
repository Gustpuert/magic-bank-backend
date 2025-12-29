require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

/**
 * 1️⃣ ENDPOINT QUE INICIA EL OAUTH
 * ESTE ES EL QUE DEBES ABRIR EN EL NAVEGADOR
 */
app.get("/auth/tiendanube", (req, res) => {
  const redirectUri =
    "https://magic-bank-backend-production-713e.up.railway.app/auth/tiendanube/callback";

  const authUrl = `https://www.tiendanube.com/apps/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;

  return res.redirect(authUrl);
});

/**
 * 2️⃣ CALLBACK - AQUÍ LLEGA EL CODE
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
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code
      }
    );

    const accessToken = tokenResponse.data.access_token;

    console.log("ACCESS TOKEN:", accessToken);
    console.log("STORE ID:", store_id);

    return res.send("OAuth OK – Token generado correctamente");
  } catch (error) {
    console.error(
      "ERROR TOKEN:",
      error.response?.data || error.message
    );
    return res.status(500).send("Error obteniendo access token");
  }
});

/**
 * 3️⃣ HEALTH CHECK
 */
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

app.listen(PORT, () => {
  console.log(`MagicBank Backend running on port ${PORT}`);
});
