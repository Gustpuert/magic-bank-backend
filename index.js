import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* Health */
app.get("/", (req, res) => {
  res.status(200).send("MagicBank Backend OK");
});

/* === GDPR WEBHOOKS (OBLIGATORIOS) === */

app.post("/webhooks/store-redact", (req, res) => {
  console.log("STORE REDACT:", req.body);
  res.sendStatus(200);
});

app.post("/webhooks/customers-redact", (req, res) => {
  console.log("CUSTOMER REDACT:", req.body);
  res.sendStatus(200);
});

app.post("/webhooks/customers-data-request", (req, res) => {
  console.log("CUSTOMER DATA REQUEST:", req.body);
  res.sendStatus(200);
});

/* OAuth callback (ya lo tenías) */
app.get("/auth/tiendanube/callback", (req, res) => {
  const { code, store_id } = req.query;

  if (!code || !store_id) {
    return res.status(400).send("Missing code or store_id");
  }

  res.status(200).send("OAuth callback OK");
});

app.listen(PORT, () => {
  console.log(`MagicBank Backend running on port ${PORT}`);
});
