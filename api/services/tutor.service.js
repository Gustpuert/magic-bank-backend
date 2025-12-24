const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function runTutor({ course_id, message, profile }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no está definida");
  }

  const promptPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  if (!fs.existsSync(promptPath)) {
    throw new Error(`System prompt no encontrado para el curso: ${course_id}`);
  }

  const systemPrompt = fs.readFileSync(promptPath, "utf-8");

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ]
  });

  const output =
    response.output?.[0]?.content?.find(
      item => item.type === "output_text"
    )?.text;

  if (!output) {
    throw new Error("OpenAI no devolvió texto");
  }

  return { text: output };
}

module.exports = { runTutor };
