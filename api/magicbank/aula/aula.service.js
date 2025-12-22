const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function runTutor({ course_id, message, profile }) {
  const promptPath = path.join(
    process.cwd(),
    "api",
    "magicbank",
    "tutors",
    course_id,
    "system_prompt.txt"
  );

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Tutor no encontrado: ${course_id}`);
  }

  const systemPrompt = fs.readFileSync(promptPath, "utf-8");

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `
Nombre: ${profile.preferred_name}
Objetivo: ${profile.learning_objective}
Nivel: ${profile.level}
`
    },
    { role: "user", content: message }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages,
    temperature: 0.3
  });

  return {
    text: completion.choices[0].message.content,
    closing: false
  };
}

module.exports = {
  runTutor
};
