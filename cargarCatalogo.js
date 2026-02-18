import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const CATALOGO = [

  {variant_id:1395732685, area:"academy", nombre:"Italiano", url:"https://chatgpt.com/g/g-694ff655ce908191871b8656228b5971-tutor-de-italiano-mb"},
  {variant_id:1395731561, area:"academy", nombre:"Portugués", url:"https://chatgpt.com/g/g-694ff45ee8a88191b72cd536885b0876-tutor-de-portugues-mb"},
  {variant_id:1395730081, area:"academy", nombre:"Chino", url:"https://chatgpt.com/g/g-694fec2d35c88191833aa2af7d92fce0-maestro-de-chino-mandarin"},
  {variant_id:1395728497, area:"academy", nombre:"Alemán", url:"https://chatgpt.com/g/g-694ff6db1224819184d471e770ab7bf4-tutor-de-aleman-mb"},
  {variant_id:1378551257, area:"academy", nombre:"Inglés", url:"https://chatgpt.com/g/g-69269540618c8191ad2fcc7a5a86b622"},
  {variant_id:1378561580, area:"academy", nombre:"Francés", url:"https://chatgpt.com/g/g-692b740a32a08191b53be9f92bede4c3"},

  {variant_id:1404604729, area:"tutor", nombre:"TAP Derecho", url:"https://chatgpt.com/g/g-695946138ec88191a7d55a83d238a968"},
  {variant_id:1404608913, area:"tutor", nombre:"TAP Ingeniería", url:"https://chatgpt.com/g/g-695949c461208191b087fe103d72c0ce"},
  {variant_id:1403228132, area:"tutor", nombre:"TAP Salud", url:"https://chatgpt.com/g/g-69593c44a6c08191accf43d956372325"},
  {variant_id:1404612037, area:"tutor", nombre:"TAP Educación", url:"https://chatgpt.com/g/g-6959471996e4819193965239320a5daa"},
  {variant_id:1404615645, area:"tutor", nombre:"TAP Administración", url:"https://chatgpt.com/g/g-69594ab53b288191bd9ab50247e1a05c"},
  {variant_id:1405073311, area:"tutor", nombre:"TAP Empresas", url:"https://chatgpt.com/g/g-695947d7fe30819181bc53041e0c96d2"},

  {variant_id:1395710455, area:"university", nombre:"Facultad Derecho", url:"https://chatgpt.com/g/g-69345443f0848191996abc2cf7cc9786"},
  {variant_id:1395711401, area:"university", nombre:"Facultad Contaduría", url:"https://chatgpt.com/g/g-6934af28002481919dd9799d7156869f"},
  {variant_id:1395720099, area:"university", nombre:"Desarrollo software", url:"https://chatgpt.com/g/g-69356a835d888191bf80e11a11e39e2e"},
  {variant_id:1395718843, area:"university", nombre:"Marketing", url:"https://chatgpt.com/g/g-693703fa8a008191b91730375fcc4d64"}
];

async function cargar() {

  for (const curso of CATALOGO) {

    await pool.query(`
      INSERT INTO catalogo
      (variant_id,nombre,area,url,activo)
      VALUES ($1,$2,$3,$4,true)
      ON CONFLICT (variant_id)
      DO UPDATE SET
      nombre=EXCLUDED.nombre,
      area=EXCLUDED.area,
      url=EXCLUDED.url,
      activo=true
    `,
    [curso.variant_id, curso.nombre, curso.area, curso.url]);

    console.log("Curso cargado:", curso.nombre);
  }

  console.log("CATALOGO COMPLETO LISTO");
  process.exit();
}

cargar();
