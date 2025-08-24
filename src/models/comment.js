const db = require("../utils/database");

/**
 * Create a new comment
 */
const createComment = async (userId, postId, content) => {
  // First check if the post exists and comments are enabled
  const postResult = await db.query(
    "SELECT id, comments_enabled FROM posts WHERE id = $1 AND is_deleted = false",
    [postId]
  );

  if (postResult.rows.length === 0) {
    throw new Error("Post not found");
  }

  if (!postResult.rows[0].comments_enabled) {
    throw new Error("Comments disabled");
  }

  const result = await db.query(
    "INSERT INTO comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING *",
    [userId, postId, content]
  );

  return result.rows[0];
};

/**
 * Get comment by ID
 */
const getCommentById = async (commentId) => {
  const result = await db.query(
    `SELECT c.*, u.username, u.name, u.profile_picture 
     FROM comments c
     INNER JOIN users u ON c.user_id = u.id
     WHERE c.id = $1 AND c.is_deleted = false`,
    [commentId]
  );

  return result.rows[0] || null;
};

/**
 * Update a comment
 */
const updateComment = async (commentId, content) => {
  const result = await db.query(
    "UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND is_deleted = false RETURNING *",
    [content, commentId]
  );

  if (result.rows.length === 0) {
    throw new Error("Comment not found");
  }

  return result.rows[0];
};

/**
 * Soft delete a comment
 */
const deleteComment = async (commentId) => {
  const result = await db.query(
    "UPDATE comments SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
    [commentId]
  );

  if (result.rows.length === 0) {
    throw new Error("Comment not found");
  }

  return result.rows[0];
};

/**
 * Get comments for a post with pagination
 */
const getPostComments = async (postId, limit, offset) => {
  // Check if post exists
  const postResult = await db.query(
    "SELECT id FROM posts WHERE id = $1 AND is_deleted = false",
    [postId]
  );

  if (postResult.rows.length === 0) {
    throw new Error("Post not found");
  }

  // Get comments with user info
  const commentsResult = await db.query(
    `SELECT c.*, u.username, u.name, u.profile_picture 
     FROM comments c
     INNER JOIN users u ON c.user_id = u.id
     WHERE c.post_id = $1 AND c.is_deleted = false
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );

  // Get total count
  const countResult = await db.query(
    "SELECT COUNT(*) FROM comments WHERE post_id = $1 AND is_deleted = false",
    [postId]
  );

  return {
    comments: commentsResult.rows,
    totalCount: parseInt(countResult.rows[0].count)
  };
};

/**
 * Get comments by a specific user
 */
const getUserComments = async (userId, limit, offset) => {
  // Check if user exists
  const userResult = await db.query(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error("User not found");
  }

  const commentsResult = await db.query(
    `SELECT c.*, p.id as post_id, p.content as post_content, u.username, u.name, u.profile_picture 
     FROM comments c
     INNER JOIN posts p ON c.post_id = p.id
     INNER JOIN users u ON p.user_id = u.id
     WHERE c.user_id = $1 AND c.is_deleted = false AND p.is_deleted = false
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await db.query(
    "SELECT COUNT(*) FROM comments WHERE user_id = $1 AND is_deleted = false",
    [userId]
  );

  return {
    comments: commentsResult.rows,
    totalCount: parseInt(countResult.rows[0].count)
  };
};

/**
 * Check if comments are enabled for a post
 */
const checkCommentsEnabled = async (postId) => {
  const result = await db.query(
    "SELECT comments_enabled FROM posts WHERE id = $1 AND is_deleted = false",
    [postId]
  );

  if (result.rows.length === 0) {
    throw new Error("Post not found");
  }

  return result.rows[0].comments_enabled;
};

/**
 * Get comment count for a post
 */
const getCommentCount = async (postId) => {
  const result = await db.query(
    "SELECT COUNT(*) FROM comments WHERE post_id = $1 AND is_deleted = false",
    [postId]
  );

  return parseInt(result.rows[0].count);
};

module.exports = {
  createComment,
  getCommentById,
  updateComment,
  deleteComment,
  getPostComments,
  getUserComments,
  checkCommentsEnabled,
  getCommentCount,
};
