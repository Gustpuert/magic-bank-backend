const fs = require("fs");
const path = require("path");

async function runTutor({ message, profile, course_id }) {
  console.log("🧠 runTutor INICIO");
  console.log("📘 course_id:", course_id);
  console.log("👤 profile:", profile);
  console.log("💬 message:", message);

  try {
    const tutorPath = path.join(
      process.cwd(),
      "api",
      "magicbank",
      "tutors",
      course_id,
      "system_prompt.txt"
    );

    console.log("📄 Buscando system_prompt en:", tutorPath);

    if (!fs.existsSync(tutorPath)) {
      console.error("❌ system_prompt NO encontrado");
      throw new Error("System prompt no encontrado para " + course_id);
    }

    const systemPrompt = fs.readFileSync(tutorPath, "utf-8");
    console.log("✅ system_prompt cargado (length:", systemPrompt.length, ")");

    console.log("🚀 Llamando a OpenAI...");

    // AQUÍ VA TU LLAMADA REAL A OPENAI
    // (no la invento porque tú ya la tienes)

    console.log("✅ OpenAI respondió");

    return {
      text: "RESPUESTA DEL TUTOR (placeholder)",
    };

  } catch (error) {
    console.error("🔥 ERROR EN runTutor:", error.message);
    throw error;
  }
}

module.exports = {
  runTutor
};
