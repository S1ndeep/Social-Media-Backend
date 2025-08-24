const express = require("express");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const {
  likePost,
  unlikePost,
  getPostLikes,
  getUserLikes
} = require("../controllers/likes");

const router = express.Router();

// Like a post
router.post("/:postId/like", authenticateToken, async (req, res) => {
  try {
    const result = await likePost(req.user.id, req.params.postId);
    res.json({ success: true, message: "Post liked", like: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Unlike a post
router.delete("/:postId/like", authenticateToken, async (req, res) => {
  try {
    const result = await unlikePost(req.user.id, req.params.postId);
    res.json({ success: true, message: "Like removed", like: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get likes for a post
router.get("/:postId", optionalAuth, async (req, res) => {
  try {
    const data = await getPostLikes(req.params.postId, 50, 0);
    res.json(data);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get posts liked by a user
router.get("/user/:userId", async (req, res) => {
  try {
    const data = await getUserLikes(req.params.userId, 50, 0);
    res.json(data);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
