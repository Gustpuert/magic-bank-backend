const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const usersFile = path.join(__dirname, "users.json");

function readUsers() {
  return JSON.parse(fs.readFileSync(usersFile, "utf8"));
}

function writeUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

exports.createUserIfNotExists = async ({ email, name }) => {
  const users = readUsers();
  let user = users.find(u => u.email === email);

  if (!user) {
    user = {
      email,
      name: name || "",
      courses: [],
      createdAt: new Date().toISOString()
    };
    users.push(user);
    writeUsers(users);
  }

  return user;
};

exports.assignCourse = async (email, course) => {
  const users = readUsers();
  const user = users.find(u => u.email === email);

  if (!user) throw new Error("Usuario no encontrado");

  if (!user.courses.includes(course)) {
    user.courses.push(course);
    writeUsers(users);
  }

  return true;
};

exports.generateJWT = (email) => {
  return jwt.sign(
    { email },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};
