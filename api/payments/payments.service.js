const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "../auth/users.json");

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function processPayment(email, course) {
  const users = readUsers();

  let user = users.find(u => u.email === email);

  if (!user) {
    user = {
      id: Date.now(),
      email,
      password: null, // se define después
      courses: [],
      createdAt: new Date().toISOString()
    };
    users.push(user);
  }

  if (!user.courses) {
    user.courses = [];
  }

  if (!user.courses.includes(course)) {
    user.courses.push(course);
  }

  saveUsers(users);
}

module.exports = {
  processPayment
};
