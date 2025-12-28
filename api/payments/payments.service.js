const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const USERS_PATH = path.join(__dirname, "../auth/users.json");

function verifySignature(signature, payload) {
  const hmac = crypto
    .createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET)
    .update(payload)
    .digest("base64");

  return hmac === signature;
}

function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(USERS_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

exports.processTiendaNubePayment = async (signature, payload) => {
  if (!verifySignature(signature, payload)) {
    throw new Error("Firma inválida");
  }

  const data = JSON.parse(payload);

  if (data.payment_status !== "paid") return;

  const email = data.customer?.email;
  const product = data.products?.[0]?.name || "curso";

  if (!email) throw new Error("Email no encontrado");

  const users = loadUsers();

  let user = users.find(u => u.email === email);

  if (!user) {
    user = {
      id: Date.now(),
      email,
      courses: [product],
      createdAt: new Date().toISOString()
    };
    users.push(user);
  } else {
    if (!user.courses.includes(product)) {
      user.courses.push(product);
    }
  }

  saveUsers(users);

  const token = jwt.sign(
    { id: user.id, email: user.email, courses: user.courses },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return token;
};
