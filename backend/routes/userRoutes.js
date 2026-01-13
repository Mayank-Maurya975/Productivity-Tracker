const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Save user after Google login
router.post("/login", async (req, res) => {
  try {
    const { name, email, uid } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ name, email, uid });
      await user.save();
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
