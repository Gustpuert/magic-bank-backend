import { runAula } from "./aula.service.js";

export async function aulaTexto(req, res) {
  try {
    const { message, profile, course_id } = req.body;

    const result = await runAula({
      message,
      profile,
      course_id
    });

    return res.json(result);

  } catch (error) {
    console.error("Aula error:", error);
    return res.status(500).json({
      response: "Error interno del tutor"
    });
  }
}
