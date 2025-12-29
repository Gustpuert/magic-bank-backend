import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank backend running");
});

/**
 * OAuth callback Tiendanube
 */
app.get("/auth/callback", async (req, res) => {
  const { code, store_id } = req.query;

  if (!code || !store_id) {
    return res.status(400).json({ error: "Missing code or store_id" });
  }

  try {
    const response = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code
      }
    );

    const accessToken = response.data.access_token;

    // aquí guardas accessToken y store_id en DB si quieres

    return res.status(200).json({
      ok: true,
      store_id,
      access_token: accessToken
    });
  } catch (error) {
    return res.status(500).json({
      error: "Token exchange failed",
      details: error.response?.data || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`MagicBank Backend corriendo en puerto ${PORT}`);
});
