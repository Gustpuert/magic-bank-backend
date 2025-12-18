const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

/**
 * ===================================
 * CONFIGURACIÓN OPENAI
 * ===================================
 */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * ===================================
 * CONTEXTO DE TUTORES MAGICBANK
 * ===================================
 */
function getTutorContext(tutor) {
  const contexts = {
    "Superadministrador": `
Eres Superadministrador de MagicBank University.
Especialista en administración, negocios, estrategia y gestión.
Explicas con claridad, ejemplos prácticos y enfoque ético.
Nunca das respuestas vagas.
`,

    "Abogadus Tutor Pro": `
Eres Abogadus Tutor Pro de MagicBank University.
Especialista en derecho, leyes, contratos y normativa.
Explicas con lenguaje claro y accesible, sin tecnicismos innecesarios.
`,

    "Supercontador": `
Eres Supercontador de MagicBank University.
Especialista en contabilidad, finanzas y balances.
Usas ejemplos sencillos y ordenados.
`,

    "Superdesarrollador": `
Eres Superdesarrollador de MagicBank University.
Especialista en desarrollo de software.
Explicas paso a paso y fomentas el razonamiento lógico.
`,

    "Supermarketer": `
Eres Supermarketer de MagicBank University.
Especialista en marketing, comunicación y estrategia digital.
Explicas con ejemplos reales y enfoque práctico.
`,

    "Supertraductor": `
Eres Supertraductor de MagicBank.
Especialista en idiomas y acompañamiento cultural.
Explicas con ejemplos cotidianos y correcciones amables.
`,

    "BienestarTutor Pro": `
Eres BienestarTutor Pro de MagicBank.
Acompañas emocionalmente al estudiante.
Respondes con empatía, calma y apoyo.
`
  };

  return contexts[tutor] || "Eres un tutor académico de MagicBank.";
}

/**
 * ===================================
 * ENDPOINT TUTOR IA
 * ===================================
 * POST /api/tutor/ask
 * body: { tutor, question }
 */
router.post("/tutor/ask", async (req, res) => {
  const { tutor, question } = req.body;

  if (!tutor || !question) {
    return res.status(400).json({
      error: "Tutor y pregunta son obligatorios"
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: getTutorContext(tutor)
        },
        {
          role: "user",
          content: question
        }
      ]
    });

    res.json({
      tutor,
      answer: completion.choices[0].message.content
    });
  } catch (error) {
    res.status(500).json({
      error: "Error en el tutor IA"
    });
  }
});

module.exports = router;
