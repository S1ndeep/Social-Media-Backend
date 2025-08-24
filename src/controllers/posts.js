const Post = require("../models/post");

/**
 * Create a new post
 */
const createPost = async (req, res) => {
  try {
    const { content, media_url, comments_enabled } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ error: "Unauthorized: missing user ID" });
    }

    const post = await Post.createPost({
      user_id,
      content,
      media_url,
      comments_enabled,
    });

    return res.status(201).json({ post });
  } catch (err) {
    console.error("[Create Post Error]", err);
    return res.status(500).json({
      error: "Failed to create post",
      details: err.message,
    });
  }
};

/**
 * Get single post by ID (with likes, comments, author info)
 */
const getPostById = async (req, res) => {
  try {
    const postId = req.params.post_id;
    const currentUserId = req.user?.id || null;

    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const post = await Post.getPostById(postId, currentUserId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.status(200).json({ post });
  } catch (err) {
    console.error("[Get Post Error]", err);
    return res.status(500).json({
      error: "Failed to fetch post",
      details: err.message,
    });
  }
};

/**
 * Get posts by user (either /my or /user/:id)
 */
const getPostsByUserId = async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    // If route is /my → use logged-in user, else use param
    const userId = req.path.includes("/my")
      ? req.user?.id
      : req.params.user_id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const currentUserId = req.user?.id || null;
    const data = await Post.getPostsByUserId(
      userId,
      currentUserId,
      parseInt(limit),
      parseInt(offset)
    );

    return res.status(200).json(data || { posts: [], totalCount: 0 });
  } catch (err) {
    console.error("[Get User Posts Error]", err);
    return res.status(500).json({
      error: "Failed to fetch posts",
      details: err.message,
    });
  }
};

/**
 * Delete a post
 */
const deletePost = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const postId = req.params.post_id;
    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const success = await Post.deletePost(postId, userId);
    if (!success) {
      return res
        .status(404)
        .json({ error: "Post not found or not authorized" });
    }

    return res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("[Delete Post Error]", err);
    return res.status(500).json({
      error: "Failed to delete post",
      details: err.message,
    });
  }
};

/**
 * Update a post
 */
const updatePost = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const postId = req.params.post_id;
    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const post = await Post.updatePost(postId, userId, req.body);
    if (!post) {
      return res
        .status(404)
        .json({ error: "Post not found or not authorized" });
    }

    return res.json({ post });
  } catch (err) {
    console.error("[Update Post Error]", err);
    return res.status(500).json({
      error: "Failed to update post",
      details: err.message,
    });
  }
};

/**
 * Get feed posts
 */
const getFeedPosts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const data = await Post.getFeedPosts(userId, limit, offset);
    return res.json(data || { posts: [], totalCount: 0 });
  } catch (err) {
    console.error("[Get Feed Error]", err);
    return res.status(500).json({
      error: "Failed to fetch feed",
      details: err.message,
    });
  }
};

/**
 * Search posts
 */
const searchPosts = async (req, res) => {
  try {
    const { q, limit = 10, offset = 0 } = req.query;
    if (!q) return res.status(400).json({ error: "Missing search query" });

    const data = await Post.searchPosts(q, parseInt(limit), parseInt(offset));
    return res.json(data || { posts: [], totalCount: 0 });
  } catch (err) {
    console.error("[Search Posts Error]", err);
    return res.status(500).json({
      error: "Failed to search posts",
      details: err.message,
    });
  }
};

module.exports = {
  createPost,
  getPostById,
  getPostsByUserId,
  deletePost,
  updatePost,
  getFeedPosts,
  searchPosts,
};
