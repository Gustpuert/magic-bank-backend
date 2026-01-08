require("dotenv").config();

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   POSTGRES
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("MagicBank Backend OK");
});

/* =========================
   OAUTH CALLBACK (SOLO INSTALACIÓN APP)
========================= */
app.get("/auth/tiendanube/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenRes = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const accessToken = tokenRes.data.access_token;
    const storeId = tokenRes.data.user_id;

    await pool.query(
      `
      INSERT INTO tiendanube_stores (store_id, access_token)
      VALUES ($1, $2)
      ON CONFLICT (store_id)
      DO UPDATE SET access_token = EXCLUDED.access_token
      `,
      [storeId, accessToken]
    );

    res.send("MagicBank instalada correctamente en Tiendanube");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("OAuth error");
  }
});

/* =========================
   MAPA CANÓNICO DE PRODUCTOS
========================= */
const PRODUCT_MAP = {

  /* ========= ACADEMY ========= */
  310593279: { tipo: "academy", nombre: "Nutrición Inteligente", url: "https://chatgpt.com/g/g-6927446749dc8191913af12801371ec9" },
  310561138: { tipo: "academy", nombre: "ChatGPT Avanzado", url: "https://chatgpt.com/g/g-6925338f45d88191b5c5c2b3080e553a-tutor-especializado" },
  310587272: { tipo: "academy", nombre: "Inglés", url: "https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622" },
  310596602: { tipo: "academy", nombre: "Cocina", url: "https://chatgpt.com/g/g-6925b1e4cff88191a3e46165e9ab7824" },
  310589317: { tipo: "academy", nombre: "Francés", url: "https://chatgpt.com/g/g-692b740a32a08191b53be9f92bede4c3-scarlet-french-magic-tutor" },
  315067066: { tipo: "academy", nombre: "Alemán", url: "https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-tutor-de-aleman-mb" },
  315067943: { tipo: "academy", nombre: "Italiano", url: "https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb" },
  315067695: { tipo: "academy", nombre: "Portugués", url: "https://chatgpt.com/g/g-694ff45ee8a88191b72cd536885b0876-tutor-de-portugues-mb" },
  315067368: { tipo: "academy", nombre: "Chino Mandarín", url: "https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin" },
  314360954: { tipo: "academy", nombre: "Artes y Oficios", url: "https://chatgpt.com/g/g-69482335eefc81918355d1df644de6d0-artesyoficios-tutor-pro" },

  /* ========= UNIVERSITY ========= */
  315058790: { tipo: "university", nombre: "Administración y Negocios", url: "https://chatgpt.com/g/g-6934d1a2900c8191ab3aafa382225a65-superadministrador-magic-tutor-pro" },
  315062639: { tipo: "university", nombre: "Marketing", url: "https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64-supermarketer-magic-tutor-pro" },
  315061516: { tipo: "university", nombre: "Contaduría", url: "https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f-supercontador-magic-tutor-pro" },
  315061240: { tipo: "university", nombre: "Derecho", url: "https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786-abogadus-magic-tutor-pro" },
  315062968: { tipo: "university", nombre: "Desarrollo de Software", url: "https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e-super-desarrollador-magic-tutor-pro" },

  /* ========= FÁBRICA DE TUTORES ========= */
  316763604: { tipo: "tutor", nombre: "TAP Empresas", url: "https://chatgpt.com/g/g-695947d7fe30819181bc53041e0c96d2-tap-empresas" },
  316682295: { tipo: "tutor", nombre: "TAP Derecho", url: "https://chatgpt.com/g/g-695946138ec88191a7d55a83d238a968-tap-abogados" },
  316683598: { tipo: "tutor", nombre: "TAP Administración Pública", url: "https://chatgpt.com/g/g-69594ab53b288191bd9ab50247e1a05c-tap-administracion-publica" },
  316681661: { tipo: "tutor", nombre: "TAP Salud", url: "https://chatgpt.com/g/g-69593c44a6c08191accf43d956372325-tap-salud" },
  316682798: { tipo: "tutor", nombre: "TAP Ingeniería", url: "https://chatgpt.com/g/g-695949c461208191b087fe103d72c0ce-tap-ingenieria" },
  316683199: { tipo: "tutor", nombre: "TAP Educación", url: "https://chatgpt.com/g/g-6959471996e4819193965239320a5daa-tap-educacion" },
  316686073: { tipo: "tutor", nombre: "Sensei", url: "https://chatgpt.com/g/g-69547fda3efc81918ba83ac2b0ec7af7-sensei-magic-tutor-pro" },
  316684646: { tipo: "tutor", nombre: "SuperTraductor", url: "https://chatgpt.com/g/g-6936d30471708191b9ac5f00163d8605-supertraductor-magic-tutor-pro" },
  316685090: { tipo: "tutor", nombre: "BienestarTutor Pro", url: "https://chatgpt.com/g/g-693e3bb199b881919ad636fff9084249-bienestartutor-pro" },
  316685729: { tipo: "tutor", nombre: "MagicBank Council", url: "https://chatgpt.com/g/g-693b0820918c819199d3922ac8bfd57f-magicbank-council" },
};

/* =========================
   ACCESS ENDPOINT
========================= */
app.get("/access/:token", async (req, res) => {
  const { token } = req.params;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  try {
    const result = await pool.query(
      `SELECT * FROM access_tokens WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(403).send("Acceso inválido");
    }

    const access = result.rows[0];

    if (new Date(access.expires_at) < new Date()) {
      return res.status(403).send("Acceso expirado");
    }

    if (access.active && access.last_ip !== ip) {
      return res.status(403).send("Acceso ya en uso en otro dispositivo");
    }

    await pool.query(
      `
      UPDATE access_tokens
      SET active = true, last_ip = $1
      WHERE token = $2
      `,
      [ip, token]
    );

    res.redirect(access.tutor_url);

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error de acceso");
  }
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Backend running on port ${PORT}`);
});
