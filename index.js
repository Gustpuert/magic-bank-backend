require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

/* -------------------- POSTGRES -------------------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* -------------------- INIT DB -------------------- */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS processed_orders (
      order_id BIGINT PRIMARY KEY,
      processed_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id SERIAL PRIMARY KEY,
      order_id BIGINT,
      product_id BIGINT,
      product_name TEXT,
      category TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('✅ Tablas verificadas / creadas correctamente');
}

/* -------------------- PRODUCT MAP -------------------- */
const PRODUCTS = {
  academy: {
    315067943: 'Curso Italiano',
    315067695: 'Curso Portugués',
    315067368: 'Curso Chino',
    315067066: 'Curso Alemán',
    310596602: 'Curso Cocina',
    310593279: 'Curso Nutrición Inteligente',
    310561138: 'Curso ChatGPT Avanzado',
    310587272: 'Curso Inglés',
    310589317: 'Curso Francés',
    314360954: 'Artes y Oficios',
    310401409: 'Curso Personalizado'
  },
  university: {
    315062968: 'Facultad Desarrollo de Software',
    315062639: 'Facultad Marketing',
    315061516: 'Facultad Contaduría',
    315061240: 'Facultad Derecho',
    315058790: 'Facultad Administración y Negocios'
  },
  tutors: {
    316763604: 'TAP Empresas',
    316682295: 'TAP Derecho',
    316683598: 'TAP Administración Pública',
    316681661: 'TAP Salud',
    316682798: 'TAP Ingeniería',
    316683199: 'TAP Educación',
    316686073: 'Sensei',
    316684646: 'Supertraductor',
    316685090: 'BienestarTutor Pro',
    316685729: 'MagicBank Council',
    316193327: 'Tutores Personalizados'
  }
};

/* -------------------- TIENDANUBE CLIENT -------------------- */
const tn = axios.create({
  baseURL: `https://api.tiendanube.com/v1/${process.env.TIENDANUBE_STORE_ID}`,
  headers: {
    Authentication: `bearer ${process.env.TIENDANUBE_ACCESS_TOKEN}`,
    'User-Agent': 'MagicBank (contacto@magicbank.ai)'
  }
});

/* -------------------- HELPERS -------------------- */
function resolveProduct(productId) {
  if (PRODUCTS.academy[productId]) {
    return { category: 'academy', name: PRODUCTS.academy[productId] };
  }
  if (PRODUCTS.university[productId]) {
    return { category: 'university', name: PRODUCTS.university[productId] };
  }
  if (PRODUCTS.tutors[productId]) {
    return { category: 'tutors', name: PRODUCTS.tutors[productId] };
  }
  return null;
}

/* -------------------- CORE ENDPOINT -------------------- */
app.get('/check-paid-orders', async (req, res) => {
  try {
    const { data: orders } = await tn.get('/orders', {
      params: { status: 'paid', per_page: 50 }
    });

    let processed = 0;

    for (const order of orders) {
      const exists = await pool.query(
        'SELECT 1 FROM processed_orders WHERE order_id = $1',
        [order.id]
      );
      if (exists.rowCount > 0) continue;

      for (const item of order.products) {
        const resolved = resolveProduct(item.product_id);
        if (!resolved) continue;

        await pool.query(
          `INSERT INTO access_logs (order_id, product_id, product_name, category)
           VALUES ($1, $2, $3, $4)`,
          [order.id, item.product_id, resolved.name, resolved.category]
        );
      }

      await pool.query(
        'INSERT INTO processed_orders (order_id) VALUES ($1)',
        [order.id]
      );

      processed++;
    }

    res.json({
      ok: true,
      processed_orders: processed
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ ok: false });
  }
});

/* -------------------- HEALTH -------------------- */
app.get('/', (req, res) => {
  res.send('🚀 MagicBank Backend running');
});

/* -------------------- START -------------------- */
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MagicBank Backend running on port ${PORT}`);
  });
});
