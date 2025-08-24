const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  getFollowStats,
  searchUsers,
  getUserById,
} = require("../controllers/users");

const router = express.Router();

/**
 * Specific routes first
 */

// GET /api/users/search?query=<name>
router.get("/search", authenticateToken, searchUsers);

// GET /api/users/following
router.get("/following", authenticateToken, getFollowing);

// GET /api/users/followers
router.get("/followers", authenticateToken, getFollowers);

// GET /api/users/stats
router.get("/stats", authenticateToken, getFollowStats);

// POST /api/users/follow
router.post("/follow", authenticateToken, followUser);

// DELETE /api/users/unfollow
router.delete("/unfollow", authenticateToken, unfollowUser);

// GET /api/users/:userId - must come last
router.get("/:userId", authenticateToken, getUserById);

module.exports = router;
