const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  createComment,
  updateComment,
  deleteComment,
  getPostComments,
} = require("../controllers/comments");

const router = express.Router();

/**
 * Comments routes
 */

// POST /api/comments/post/:postId - Create a comment on a post
router.post("/post/:postId", authenticateToken, createComment);

// PUT /api/comments/:commentId - Update a comment
router.put("/:commentId", authenticateToken, updateComment);

// DELETE /api/comments/:commentId - Delete a comment
router.delete("/:commentId", authenticateToken, deleteComment);

// GET /api/comments/post/:postId - Get comments for a post
router.get("/post/:postId", getPostComments);

module.exports = router;
