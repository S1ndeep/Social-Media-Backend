const express = require("express");
const {
  validateRequest,
  createPostSchema,
  updatePostSchema,
} = require("../utils/validation");

const {
  createPost,
  getPostById,
  getPostsByUserId,
  deletePost,
  updatePost,
  getFeedPosts,
} = require("../controllers/posts");

const { authenticateToken, optionalAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * Posts routes
 */

// POST /api/posts - Create a new post
router.post(
  "/",
  authenticateToken,
  validateRequest(createPostSchema),
  createPost
);

// GET /api/posts/my - Get current user's posts
router.get("/my", authenticateToken, getPostsByUserId);

// GET /api/posts/user/:user_id - Get posts by a specific user
router.get("/user/:user_id", optionalAuth, getPostsByUserId);

// GET /api/posts/feed - Get posts from followed users
router.get("/feed", authenticateToken, getFeedPosts);

// GET /api/posts/:post_id - Get a single post by ID
router.get("/:post_id", optionalAuth, getPostById);

// PUT /api/posts/:post_id - Update a post
router.put(
  "/:post_id",
  authenticateToken,
  validateRequest(updatePostSchema),
  updatePost
);

// DELETE /api/posts/:post_id - Delete a post
router.delete("/:post_id", authenticateToken, deletePost);

module.exports = router;
