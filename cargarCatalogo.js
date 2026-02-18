import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
CATÁLOGO SOBERANO (ÚNICO)
PRODUCT_ID + VARIANT_ID
========================= */

const CATALOGO = [

{product_id:315067943,variant_id:1395732685,area:"academy",nombre:"Italiano",url:"https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb"},
{product_id:315067695,variant_id:1395731561,area:"academy",nombre:"Portugués",url:"https://chatgpt.com/g/g-694ff45ee8a88191b72cd536885b0876-tutor-de-portugues-mb"},
{product_id:315067368,variant_id:1395730081,area:"academy",nombre:"Chino",url:"https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin"},
{product_id:315067066,variant_id:1395728497,area:"academy",nombre:"Alemán",url:"https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-tutor-de-aleman-mb"},
{product_id:310587272,variant_id:1378551257,area:"academy",nombre:"Inglés",url:"https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622"},
{product_id:310589317,variant_id:1378561580,area:"academy",nombre:"Francés",url:"https://chatgpt.com/g/g-692af8c0b460819197c6c780bb96aaed"},

{product_id:314360954,variant_id:1392376185,area:"academy",nombre:"Artes y oficios",url:"https://chatgpt.com/g/g-69482335eefc81918355d1df644de6d0-artesyoficios-tutor-pro"},
{product_id:307869983,variant_id:1368270221,area:"academy",nombre:"Trading cíclico",url:"https://chatgpt.com/g/g-6936550a35bc81919aa54bae25f5e133"},
{product_id:308837703,variant_id:1371792802,area:"academy",nombre:"Banca digital",url:"https://chatgpt.com/g/g-68f5676553c48191b9134e9f3f874efa"},
{product_id:308900626,variant_id:1372153030,area:"academy",nombre:"Pensiones mágicas",url:"https://chatgpt.com/g/g-6927e4527ac881919cf2697da6dd674b"},
{product_id:310596602,variant_id:1378595247,area:"academy",nombre:"Cocina avanzada",url:"https://chatgpt.com/g/g-6925b1e4cff88191a3e46165e9ab7824"},
{product_id:310593279,variant_id:1378580741,area:"academy",nombre:"Nutrición inteligente",url:"https://chatgpt.com/g/g-6927446749dc8191913af12801371ec9"},
{product_id:310561138,variant_id:1378405952,area:"academy",nombre:"Curso avanzado ChatGPT",url:"https://chatgpt.com/g/g-6925338f45d88191b5c5c2b3080e553a"},
{product_id:310399419,variant_id:1377781307,area:"academy",nombre:"Cursos avanzados MagicBank",url:"https://chatgpt.com/g/g-69547fda3efc81918ba83ac2b0ec7af7"},

{product_id:316685729,variant_id:1404624823,area:"academy",nombre:"MagicBank Council",url:"https://chatgpt.com/g/g-693b0820918c819199d3922ac8bfd57f"},

{product_id:315061240,variant_id:1395710455,area:"university",nombre:"Facultad Derecho",url:"https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786"},
{product_id:315061516,variant_id:1395711401,area:"university",nombre:"Facultad Contaduría",url:"https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f"},
{product_id:315058790,variant_id:1395698767,area:"university",nombre:"Administración y negocios",url:"https://chatgpt.com/g/g-6934d1a2900c8191ab3aafa382225a65"},
{product_id:315062968,variant_id:1395720099,area:"university",nombre:"Desarrollo software",url:"https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e"},
{product_id:315062639,variant_id:1395718843,area:"university",nombre:"Marketing",url:"https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64"},

{product_id:316681661,variant_id:1404599981,area:"tutor",nombre:"TAP Salud",url:"https://chatgpt.com/g/g-69593c44a6c08191accf43d956372325"},
{product_id:316683199,variant_id:1404612037,area:"tutor",nombre:"TAP Educación",url:"https://chatgpt.com/g/g-6959471996e4819193965239320a5daa"},
{product_id:316683598,variant_id:1404615645,area:"tutor",nombre:"TAP Administración",url:"https://chatgpt.com/g/g-69594ab53b288191bd9ab50247e1a05c"},
{product_id:316682295,variant_id:1404604729,area:"tutor",nombre:"TAP Derecho",url:"https://chatgpt.com/g/g-695946138ec88191a7d55a83d238a968"},
{product_id:316682789,variant_id:1404608913,area:"tutor",nombre:"TAP Ingeniería",url:"https://chatgpt.com/g/g-695949c461208191b087fe103d72c0ce"},
{product_id:316763604,variant_id:1405073311,area:"tutor",nombre:"TAP Empresas",url:"https://chatgpt.com/g/g-695947d7fe30819181bc53041e0c96d2"}

];

/* =========================
SINCRONIZACIÓN ROBUSTA
UPDATE + INSERT
========================= */

async function sincronizarCatalogo() {

  console.log("SINCRONIZANDO CATALOGO SOBERANO...");

  for (const curso of CATALOGO) {

    // 1) actualizar si existe
    const update = await pool.query(`
      UPDATE catalogo SET
        product_id = $1,
        nombre = $3,
        area = $4,
        url = $5,
        activo = true
      WHERE variant_id = $2
    `,
    [
      curso.product_id,
      curso.variant_id,
      curso.nombre,
      curso.area,
      curso.url
    ]);

    // 2) si no existía → insertar
    if (update.rowCount === 0) {

      await pool.query(`
        INSERT INTO catalogo
        (product_id,variant_id,nombre,area,url,activo)
        VALUES ($1,$2,$3,$4,$5,true)
      `,
      [
        curso.product_id,
        curso.variant_id,
        curso.nombre,
        curso.area,
        curso.url
      ]);
    }

    console.log("OK:", curso.nombre);
  }

  console.log("CATALOGO 100% SINCRONIZADO");
  process.exit();
}

sincronizarCatalogo();
