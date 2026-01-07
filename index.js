/**
 * MagicBank Backend – Tiendanube Webhooks
 * Academy + University + Fábrica de Tutores
 * Activación automática de accesos
 */

import express from "express";
import pkg from "pg";
import fetch from "node-fetch";

const { Pool } = pkg;
const app = express();
app.use(express.json());

// ===============================
// ENV
// ===============================
const {
  DATABASE_URL,
  TIENDANUBE_ACCESS_TOKEN,
  TIENDANUBE_STORE_ID,
  PORT = 8080
} = process.env;

// ===============================
// DB
// ===============================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===============================
// PRODUCTOS → TIPO / NOMBRE
// ===============================
const PRODUCTS_MAP = {
  // =========================
  // ACADEMY – CURSOS
  // =========================
  315067943: { type: "academy", name: "Curso de Italiano" },
  315067695: { type: "academy", name: "Curso de Portugués" },
  315067368: { type: "academy", name: "Curso de Chino" },
  315067066: { type: "academy", name: "Curso de Alemán" },
  310596602: { type: "academy", name: "Curso de Cocina" },
  310593279: { type: "academy", name: "Curso de Nutrición Inteligente" },
  310561138: { type: "academy", name: "Curso Avanzado de ChatGPT" },
  310587272: { type: "academy", name: "Curso de Inglés" },
  310589317: { type: "academy", name: "Curso de Francés" },
  314360954: { type: "academy", name: "Artes y Oficios" },
  310401409: { type: "academy", name: "Curso Personalizado" },

  // =========================
  // UNIVERSITY – FACULTADES
  // =========================
  315062968: { type: "university", name: "Facultad Desarrollo de Software" },
  315062639: { type: "university", name: "Facultad de Marketing" },
  315061516: { type: "university", name: "Facultad de Contaduría" },
  315061240: { type: "university", name: "Facultad de Derecho" },
  315058790: { type: "university", name: "Facultad de Administración y Negocios" },

  // =========================
  // FÁBRICA DE TUTORES
  // =========================
  316763604: { type: "tutor_factory", name: "TAP Empresas" },
  316682295: { type: "tutor_factory", name: "TAP Derecho" },
  316683598: { type: "tutor_factory", name: "TAP Administración Pública" },
  316681661: { type: "tutor_factory", name: "TAP Salud" },
  316682798: { type: "tutor_factory", name: "TAP Ingeniería" },
  316683199: { type: "tutor_factory", name: "TAP Educación" },
  316686073: { type: "tutor_factory", name: "Sensei" },
  316684646: { type: "tutor_factory", name: "Supertraductor" },
  316685090: { type: "tutor_factory", name: "BienestarTutor Pro" },
  316685729: { type: "tutor_factory", name: "MagicBank Council" },
  316193327: { type: "tutor_factory", name: "Tutores Personalizados" }
};

// ===============================
// INIT DB
// ===============================
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL,
      product_id BIGINT NOT NULL,
      product_type TEXT NOT NULL,
      product_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(order_id, product_id)
    );
  `);

  console.log("✅ Tablas verificadas / creadas correctamente");
}

// ===============================
// TIENDANUBE API
// ===============================
async function getOrder(orderId) {
  const res = await fetch(
    `https://api.tiendanube.com/v1/${TIENDANUBE_STORE_ID}/orders/${orderId}`,
    {
      headers: {
        "Authentication": `bearer ${TIENDANUBE_ACCESS_TOKEN}`,
        "User-Agent": "MagicBank-App"
      }
    }
  );

  if (!res.ok) {
    throw new Error("Error obteniendo orden Tiendanube");
  }

  return res.json();
}

// ===============================
// WEBHOOK
// ===============================
app.post("/webhooks/tiendanube", async (req, res) => {
  try {
    const { event, id: orderId } = req.body;

    if (event !== "order.paid") {
      return res.json({ status: "ignored" });
    }

    const order = await getOrder(orderId);
    const email = order.customer?.email;

    if (!email) {
      throw new Error("Email no encontrado");
    }

    let created = 0;

    for (const item of order.products) {
      const map = PRODUCTS_MAP[item.product_id];
      if (!map) continue;

      await pool.query(
        `
        INSERT INTO enrollments
          (order_id, product_id, product_type, product_name, customer_email)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        `,
        [
          orderId,
          item.product_id,
          map.type,
          map.name,
          email
        ]
      );

      created++;
    }

    res.json({
      status: "OK",
      order_id: orderId,
      enrollments_created: created
    });

  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ error: "internal_error" });
  }
});

// ===============================
// HEALTHCHECK
// ===============================
app.get("/", (_, res) => {
  res.send("🚀 MagicBank Backend running");
});

// ===============================
// START
// ===============================
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MagicBank Backend running on port ${PORT}`);
  });
});
