import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ RUTA RAÍZ OBLIGATORIA
app.get("/", (req, res) => {
  res.status(200).send("MagicBank backend activo");
});

// ✅ HEALTHCHECK
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ❌ NO IMPORTES node-fetch
// ❌ NO: import fetch from "node-fetch";

app.listen(PORT, () => {
  console.log(`MagicBank Backend running on port ${PORT}`);
});
