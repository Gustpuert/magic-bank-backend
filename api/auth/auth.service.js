const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const USERS_PATH = path.join(__dirname, "users.json");

/* =========================
   HELPERS
========================= */

function loadUsers() {
  const raw = fs.readFileSync(USERS_PATH, "utf-8");
  return JSON.parse(raw);
}

function saveUsers(data) {
  fs.writeFileSync(
    USERS_PATH,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}

/* =========================
   REGISTRO AUTOMÁTICO
========================= */

async function registerUser({ email, password, course_id, source }) {
  const data = loadUsers();

  const existing = data.users.find(u => u.email === email);

  const now = new Date().toISOString();

  if (existing) {
    // Usuario existe → agregar curso
    existing.courses.push({
      course_id,
      source,
      activated_at: now,
      expires_at: addYears(now, 3),
      status: "active"
    });

    saveUsers(data);
    return existing;
  }

  // Usuario nuevo
  const password_hash = await bcrypt.hash(password, 10);

  const newUser = {
    id: uuidv4(),
    email,
    password_hash,
    created_at: now,
    courses: [
      {
        course_id,
        source,
        activated_at: now,
        expires_at: addYears(now, 3),
        status: "active"
      }
    ]
  };

  data.users.push(newUser);
  saveUsers(data);

  return newUser;
}

module.exports = {
  registerUser
};
