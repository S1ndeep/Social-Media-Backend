const db = require("../utils/database");

/**
 * Create a new post
 * @param {Object} postData - Post data
 * @returns {Promise<Object>} Created post
 */
const createPost = async ({
  user_id,
  content,
  media_url = null,
  comments_enabled = true,
}) => {
  const result = await db.query(
    `INSERT INTO posts (user_id, content, media_url, comments_enabled)
     VALUES ($1, $2, $3, $4)
     RETURNING id AS post_id, user_id, content, media_url, comments_enabled, created_at, updated_at`,
    [user_id, content, media_url, comments_enabled]
  );
  return result.rows[0] || null;
};

/**
 * Get post by ID
 * @param {number} postId - Post ID
 * @returns {Promise<Object|null>} Post object or null
 */
const getPostById = async (postId) => {
  const result = await db.query(
    `SELECT p.id AS post_id, p.user_id, p.content, p.media_url,
            p.comments_enabled, p.is_deleted, p.created_at, p.updated_at,
            u.username, u.name, u.profile_picture,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) AS comment_count,
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = p.user_id) AS liked_by_user
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.id = $1 AND p.is_deleted = false`,
    [postId]
  );
  return result.rows[0] || null;
};

/**
 * Get posts by user ID
 */
const getPostsByUserId = async (userId, limit = 20, offset = 0) => {
  const userResult = await db.query(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [userId]
  );
  if (userResult.rows.length === 0) throw new Error("User not found");

  const postsResult = await db.query(
    `SELECT p.id AS post_id, p.user_id, p.content, p.media_url,
            p.comments_enabled, p.created_at, p.updated_at,
            u.username, u.name, u.profile_picture,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) AS comment_count
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.user_id = $1 AND p.is_deleted = false
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await db.query(
    "SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_deleted = false",
    [userId]
  );

  return {
    posts: postsResult.rows,
    totalCount: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Delete a post (soft delete)
 */
const deletePost = async (postId, userId) => {
  const result = await db.query(
    "UPDATE posts SET is_deleted = true WHERE id = $1 AND user_id = $2 RETURNING id",
    [postId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Update a post
 */
const updatePost = async (postId, userId, { content, media_url, comments_enabled }) => {
  const updates = [];
  const params = [];

  if (content !== undefined) {
    updates.push(`content = $${params.length + 1}`);
    params.push(content);
  }
  if (media_url !== undefined) {
    updates.push(`media_url = $${params.length + 1}`);
    params.push(media_url);
  }
  if (comments_enabled !== undefined) {
    updates.push(`comments_enabled = $${params.length + 1}`);
    params.push(comments_enabled);
  }

  if (updates.length === 0) {
    throw new Error("No fields to update");
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");

  const query = `
    UPDATE posts
    SET ${updates.join(", ")}
    WHERE id = $${params.length + 1} AND user_id = $${params.length + 2}
    RETURNING id AS post_id, user_id, content, media_url, comments_enabled, created_at, updated_at
  `;

  params.push(postId, userId);

  const result = await db.query(query, params);
  return result.rows[0] || null;
};

/**
 * Get feed posts from followed users
 */
const getFeedPosts = async (userId, limit = 20, offset = 0) => {
  const postsResult = await db.query(
    `SELECT p.id AS post_id, p.user_id, p.content, p.media_url,
            p.comments_enabled, p.created_at, p.updated_at,
            u.username, u.name, u.profile_picture,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) AS comment_count,
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) AS liked_by_user
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE (p.user_id = $1 OR p.user_id IN (
       SELECT following_id FROM follows WHERE follower_id = $1
     )) AND p.is_deleted = false
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await db.query(
    `SELECT COUNT(*) FROM posts p
     WHERE (p.user_id = $1 OR p.user_id IN (
       SELECT following_id FROM follows WHERE follower_id = $1
     )) AND p.is_deleted = false`,
    [userId]
  );

  return {
    posts: postsResult.rows,
    totalCount: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Search posts by content
 */
const searchPosts = async (searchQuery, limit = 20, offset = 0) => {
  const searchTerm = `%${searchQuery}%`;

  const postsResult = await db.query(
    `SELECT p.id AS post_id, p.user_id, p.content, p.media_url,
            p.comments_enabled, p.created_at, p.updated_at,
            u.username, u.name, u.profile_picture,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) AS comment_count
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.content ILIKE $1 AND p.is_deleted = false
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [searchTerm, limit, offset]
  );

  const countResult = await db.query(
    "SELECT COUNT(*) FROM posts p WHERE p.content ILIKE $1 AND p.is_deleted = false",
    [searchTerm]
  );

  return {
    posts: postsResult.rows,
    totalCount: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Get posts with media (photos/videos)
 */
const getPostsWithMedia = async (userId, limit = 20, offset = 0) => {
  const postsResult = await db.query(
    `SELECT p.id AS post_id, p.user_id, p.content, p.media_url,
            p.comments_enabled, p.created_at, p.updated_at,
            u.username, u.name, u.profile_picture,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) AS comment_count
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.user_id = $1 AND p.media_url IS NOT NULL AND p.is_deleted = false
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await db.query(
    "SELECT COUNT(*) FROM posts WHERE user_id = $1 AND media_url IS NOT NULL AND is_deleted = false",
    [userId]
  );

  return {
    posts: postsResult.rows,
    totalCount: parseInt(countResult.rows[0].count, 10),
  };
};

module.exports = {
  createPost,
  getPostById,
  getPostsByUserId,
  deletePost,
  updatePost,
  getFeedPosts,
  searchPosts,
  getPostsWithMedia,
};
