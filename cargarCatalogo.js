import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
CATALOGO SOBERANO CONGELADO
PRODUCT_ID + VARIANT_ID
========================= */

const CATALOGO = {

315067943:{variant:1395732685,area:"academy",nombre:"Italiano",url:"https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb"},
315067695:{variant:1395731561,area:"academy",nombre:"Portugués",url:"https://chatgpt.com/g/g-694ff45ee8a88191b72cd536885b0876-tutor-de-portugues-mb"},
315067368:{variant:1395730081,area:"academy",nombre:"Chino",url:"https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin"},
315067066:{variant:1395728497,area:"academy",nombre:"Alemán",url:"https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-tutor-de-aleman-mb"},
310587272:{variant:1378551257,area:"academy",nombre:"Inglés",url:"https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622"},
310589317:{variant:1378561580,area:"academy",nombre:"Francés",url:"https://chatgpt.com/g/g-692af8c0b460819197c6c780bb96aaed"},

314360954:{variant:1392376185,area:"academy",nombre:"Artes y oficios",url:"https://chatgpt.com/g/g-69482335eefc81918355d1df644de6d0-artesyoficios-tutor-pro"},
307869983:{variant:1368270221,area:"academy",nombre:"Trading cíclico",url:"https://chatgpt.com/g/g-6936550a35bc81919aa54bae25f5e133"},
308837703:{variant:1371792802,area:"academy",nombre:"Banca digital",url:"https://chatgpt.com/g/g-68f5676553c48191b9134e9f3f874efa"},
308900626:{variant:1372153030,area:"academy",nombre:"Pensiones mágicas",url:"https://chatgpt.com/g/g-6927e4527ac881919cf2697da6dd674b"},
310596602:{variant:1378595247,area:"academy",nombre:"Cocina avanzada",url:"https://chatgpt.com/g/g-6925b1e4cff88191a3e46165e9ab7824"},
310593279:{variant:1378580741,area:"academy",nombre:"Nutrición inteligente",url:"https://chatgpt.com/g/g-6927446749dc8191913af12801371ec9"},
310561138:{variant:1378405952,area:"academy",nombre:"Curso avanzado ChatGPT",url:"https://chatgpt.com/g/g-6925338f45d88191b5c5c2b3080e553a"},
310399419:{variant:1377781307,area:"academy",nombre:"Cursos avanzados MagicBank",url:"https://chatgpt.com/g/g-69547fda3efc81918ba83ac2b0ec7af7"},

316685729:{variant:1404624823,area:"academy",nombre:"MagicBank Council",url:"https://chatgpt.com/g/g-693b0820918c819199d3922ac8bfd57f"},

315061240:{variant:1395710455,area:"university",nombre:"Facultad Derecho",url:"https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786"},
315061516:{variant:1395711401,area:"university",nombre:"Facultad Contaduría",url:"https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f"},
315058790:{variant:1395698767,area:"university",nombre:"Administración y negocios",url:"https://chatgpt.com/g/g-6934d1a2900c8191ab3aafa382225a65"},
315062968:{variant:1395720099,area:"university",nombre:"Desarrollo software",url:"https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e"},
315062639:{variant:1395718843,area:"university",nombre:"Marketing",url:"https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64"},

316681661:{variant:1404599981,area:"tutor",nombre:"TAP Salud",url:"https://chatgpt.com/g/g-69593c44a6c08191accf43d956372325"},
316683199:{variant:1404612037,area:"tutor",nombre:"TAP Educación",url:"https://chatgpt.com/g/g-6959471996e4819193965239320a5daa"},
316683598:{variant:1404615645,area:"tutor",nombre:"TAP Administración",url:"https://chatgpt.com/g/g-69594ab53b288191bd9ab50247e1a05c"},
316682295:{variant:1404604729,area:"tutor",nombre:"TAP Derecho",url:"https://chatgpt.com/g/g-695946138ec88191a7d55a83d238a968"},
316682789:{variant:1404608913,area:"tutor",nombre:"TAP Ingeniería",url:"https://chatgpt.com/g/g-695949c461208191b087fe103d72c0ce"},
316763604:{variant:1405073311,area:"tutor",nombre:"TAP Empresas",url:"https://chatgpt.com/g/g-695947d7fe30819181bc53041e0c96d2"}

};

async function cargar() {

  for (const product_id in CATALOGO) {

    const curso = CATALOGO[product_id];

    await pool.query(`
      INSERT INTO catalogo
      (product_id,variant_id,nombre,area,url,activo)
      VALUES ($1,$2,$3,$4,$5,true)
      ON CONFLICT (product_id)
      DO UPDATE SET
      variant_id=EXCLUDED.variant_id,
      nombre=EXCLUDED.nombre,
      area=EXCLUDED.area,
      url=EXCLUDED.url,
      activo=true
    `,
    [product_id, curso.variant, curso.nombre, curso.area, curso.url]);

    console.log("Curso sincronizado:", curso.nombre);
  }

  console.log("CATALOGO SOBERANO OK");
  process.exit();
}

cargar();
