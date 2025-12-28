function validateSession(req, res) {
  const now = Math.floor(Date.now() / 1000);

  res.status(200).json({
    valid: true,
    user: req.user,
    expires_in: req.user.exp - now
  });
}

module.exports = {
  validateSession
};
