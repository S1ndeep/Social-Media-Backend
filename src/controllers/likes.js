const db = require("../utils/database");

/**
 * Like a post
 */
const likePost = async (userId, postId) => {
  const userResult = await db.query(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [userId]
  );
  const userRows = userResult.rows;
  if (userRows.length === 0) throw new Error("User not found");

  const postResult = await db.query(
    "SELECT id FROM posts WHERE id = $1 AND is_deleted = false",
    [postId]
  );
  const postRows = postResult.rows;
  if (postRows.length === 0) throw new Error("Post not found");

  const existingResult = await db.query(
    "SELECT * FROM likes WHERE user_id = $1 AND post_id = $2",
    [userId, postId]
  );
  const existingRows = existingResult.rows;
  if (existingRows.length > 0) throw new Error("Already liked this post");

  const insertResult = await db.query(
    "INSERT INTO likes (user_id, post_id) VALUES ($1, $2) RETURNING *",
    [userId, postId]
  );
  return insertResult.rows[0];
};

/**
 * Unlike a post
 */
const unlikePost = async (userId, postId) => {
  const result = await db.query(
    "DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING *",
    [userId, postId]
  );
  const rows = result.rows;
  if (rows.length === 0) throw new Error("Like not found");
  return rows[0];
};

/**
 * Check if a user has liked a post
 */
const hasUserLikedPost = async (userId, postId) => {
  const result = await db.query(
    "SELECT * FROM likes WHERE user_id = $1 AND post_id = $2",
    [userId, postId]
  );
  const rows = result.rows;
  return rows.length > 0;
};

/**
 * Get likes for a specific post with pagination
 */
const getPostLikes = async (postId, limit, offset) => {
  const postResult = await db.query(
    "SELECT id FROM posts WHERE id = $1 AND is_deleted = false",
    [postId]
  );
  if (postResult.rows.length === 0) throw new Error("Post not found");

  const likesResult = await db.query(
    `SELECT l.*, u.username, u.name, u.profile_picture 
     FROM likes l
     INNER JOIN users u ON l.user_id = u.id
     WHERE l.post_id = $1 AND u.is_deleted = false
     ORDER BY l.created_at DESC
     LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );
  const likesRows = likesResult.rows;

  const countResult = await db.query(
    "SELECT COUNT(*) FROM likes l INNER JOIN users u ON l.user_id = u.id WHERE l.post_id = $1 AND u.is_deleted = false",
    [postId]
  );

  return {
    likes: likesRows,
    totalCount: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Get posts liked by a specific user with pagination
 */
const getUserLikes = async (userId, limit, offset) => {
  const userResult = await db.query(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [userId]
  );
  if (userResult.rows.length === 0) throw new Error("User not found");

  const likedResult = await db.query(
    `SELECT p.*, u.username, u.name as author_name, u.profile_picture as author_profile_picture,
            l.created_at as liked_at,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) as comment_count
     FROM likes l
     INNER JOIN posts p ON l.post_id = p.id
     INNER JOIN users u ON p.user_id = u.id
     WHERE l.user_id = $1 AND p.is_deleted = false AND u.is_deleted = false
     ORDER BY l.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  const likedRows = likedResult.rows;

  const countResult = await db.query(
    "SELECT COUNT(*) FROM likes l INNER JOIN posts p ON l.post_id = p.id WHERE l.user_id = $1 AND p.is_deleted = false",
    [userId]
  );

  return {
    likedPosts: likedRows,
    totalCount: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Get like count for a post
 */
const getPostLikeCount = async (postId) => {
  const result = await db.query(
    "SELECT COUNT(*) FROM likes WHERE post_id = $1",
    [postId]
  );
  return parseInt(result.rows[0].count, 10);
};

/**
 * Get recent likes for a user's posts (notification feature)
 */
const getRecentLikesForUserPosts = async (userId, limit = 10) => {
  const userResult = await db.query(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [userId]
  );
  if (userResult.rows.length === 0) throw new Error("User not found");

  const recentResult = await db.query(
    `SELECT l.*, u.username, u.name, u.profile_picture, p.id as post_id, p.content as post_content
     FROM likes l
     INNER JOIN users u ON l.user_id = u.id
     INNER JOIN posts p ON l.post_id = p.id
     WHERE p.user_id = $1 AND u.is_deleted = false AND p.is_deleted = false
     ORDER BY l.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return recentResult.rows;
};

/**
 * Get most liked posts (popular posts feature)
 */
const getMostLikedPosts = async (limit = 10, timeFrame = 'all') => {
  let timeCondition = '';
  if (timeFrame === 'day') timeCondition = " AND p.created_at >= CURRENT_DATE - INTERVAL '1 day'";
  else if (timeFrame === 'week') timeCondition = " AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'";
  else if (timeFrame === 'month') timeCondition = " AND p.created_at >= CURRENT_DATE - INTERVAL '30 days'";

  const result = await db.query(
    `SELECT p.*, u.username, u.name, u.profile_picture,
            COUNT(l.id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) as comment_count
     FROM posts p
     INNER JOIN users u ON p.user_id = u.id
     LEFT JOIN likes l ON p.id = l.post_id
     WHERE p.is_deleted = false AND u.is_deleted = false ${timeCondition}
     GROUP BY p.id, u.id
     ORDER BY like_count DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};

module.exports = {
  likePost,
  unlikePost,
  hasUserLikedPost,
  getPostLikes,
  getUserLikes,
  getPostLikeCount,
  getRecentLikesForUserPosts,
  getMostLikedPosts,
};
