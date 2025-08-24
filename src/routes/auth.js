const express = require("express");
const router = express.Router();

const { register, login, getProfile } = require("../controllers/auth");
const { authenticateToken } = require("../middleware/auth");
const {
  validateRequest,
  userRegistrationSchema,
  userLoginSchema,
} = require("../utils/validation");

// Register new user
router.post(
  "/register",
  validateRequest(userRegistrationSchema),
  register
);

// Login user
router.post(
  "/login",
  validateRequest(userLoginSchema),
  login
);

// Get current logged-in user profile
router.get(
  "/me",
  authenticateToken,
  getProfile
);

module.exports = router;
