const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const USERS_FILE = path.join(__dirname, "users.json");

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

exports.createUserAndToken = async (email, course) => {
  const users = readUsers();

  let user = users.find(u => u.email === email);

  if (!user) {
    user = {
      id: Date.now(),
      email,
      courses: [course],
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      course
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  return {
    token,
    redirectUrl: `https://academy.magicbank.org/tutor?token=${token}`
  };
};
