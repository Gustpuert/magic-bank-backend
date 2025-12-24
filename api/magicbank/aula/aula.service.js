import { runTutor } from "../../services/tutor.service.js";

export async function runAula({ message, profile, course_id }) {
  return await runTutor({ message, profile, course_id });
}
