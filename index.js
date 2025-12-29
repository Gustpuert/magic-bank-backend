import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("MagicBank backend activo");
});

app.get("/auth/tiendanube", (req, res) => {
  const url = `https://www.tiendanube.com/apps/${process.env.CLIENT_ID}/authorize`;
  res.redirect(url);
});

app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code, store_id } = req.query;

  if (!code || !store_id) {
    return res.status(400).send("Missing code or store_id");
  }

  try {
    const response = await fetch("https://api.tiendanube.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MagicBank Access Gateway"
      },
      body: JSON.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code
      })
    });

    const data = await response.json();

    if (!data.access_token) {
      return res.status(400).json(data);
    }

    res.send(`App instalada correctamente en la tienda ${store_id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth error");
  }
});

app.listen(PORT, () => {
  console.log(`MagicBank Backend running on port ${PORT}`);
});
