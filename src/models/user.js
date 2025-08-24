const db = require("../utils/database");
const bcrypt = require("bcryptjs");

/**
 * User model for database operations (PostgreSQL)
 */

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
const createUser = async ({ username, email, password, name }) => {
  const hashedPassword = await bcrypt.hash(password, 12);

  const result = await db.query(
    `INSERT INTO users (username, email, password_hash, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, email, name, profile_picture, created_at`,
    [username, email, hashedPassword, name]
  );
  const rows = result.rows;
  return rows[0];
};

/**
 * Find user by username
 */
const getUserByUsername = async (username) => {
  const result = await db.query(
    "SELECT * FROM users WHERE username = $1 AND is_deleted = false",
    [username]
  );
  const rows = result.rows;
  return rows[0] || null;
};

/**
 * Find user by ID
 */
const getUserById = async (id) => {
  const result = await db.query(
    "SELECT id, username, email, name, profile_picture, created_at FROM users WHERE id = $1 AND is_deleted = false",
    [id]
  );
  const rows = result.rows;
  return rows[0] || null;
};

/**
 * Find user by email
 */
const getUserByEmail = async (email) => {
  const result = await db.query(
    "SELECT * FROM users WHERE email = $1 AND is_deleted = false",
    [email]
  );
  const rows = result.rows;
  return rows[0] || null;
};

/**
 * Verify user password
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Search users by name or username
 */
const findUsersByName = async (query, limit = 20, offset = 0) => {
  const searchTerm = `%${query}%`;

  const usersResult = await db.query(
    `SELECT id, username, name, profile_picture, created_at
     FROM users
     WHERE (username ILIKE $1 OR name ILIKE $1) AND is_deleted = false
     ORDER BY username
     LIMIT $2 OFFSET $3`,
    [searchTerm, limit, offset]
  );
  const usersRows = usersResult.rows;

  const countResult = await db.query(
    "SELECT COUNT(*) FROM users WHERE (username ILIKE $1 OR name ILIKE $1) AND is_deleted = false",
    [searchTerm]
  );
  const countRows = countResult.rows;

  return {
    users: usersRows,
    totalCount: parseInt(countRows[0].count, 10),
  };
};

/**
 * Get user profile with follow counts
 */
const getUserProfile = async (userId) => {
  const userResult = await db.query(
    `SELECT id, username, name, profile_picture, created_at
     FROM users
     WHERE id = $1 AND is_deleted = false`,
    [userId]
  );
  const userRows = userResult.rows;
  if (!userRows[0]) return null;

  const followerCountResult = await db.query(
    "SELECT COUNT(*) FROM follows f INNER JOIN users u ON f.follower_id = u.id WHERE f.following_id = $1 AND u.is_deleted = false",
    [userId]
  );
  const followerCountRows = followerCountResult.rows;

  const followingCountResult = await db.query(
    "SELECT COUNT(*) FROM follows f INNER JOIN users u ON f.following_id = u.id WHERE f.follower_id = $1 AND u.is_deleted = false",
    [userId]
  );
  const followingCountRows = followingCountResult.rows;

  const postCountResult = await db.query(
    "SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_deleted = false",
    [userId]
  );
  const postCountRows = postCountResult.rows;

  return {
    ...userRows[0],
    follower_count: parseInt(followerCountRows[0].count, 10),
    following_count: parseInt(followingCountRows[0].count, 10),
    post_count: parseInt(postCountRows[0].count, 10),
  };
};

/**
 * Update user profile
 */
const updateUserProfile = async (userId, { name, profile_picture }) => {
  let updates = [];
  let params = [];
  let idx = 1;

  if (name !== undefined) {
    updates.push(`name = $${idx++}`);
    params.push(name);
  }
  if (profile_picture !== undefined) {
    updates.push(`profile_picture = $${idx++}`);
    params.push(profile_picture);
  }

  if (updates.length === 0) {
    throw new Error("No fields to update");
  }

  params.push(userId);

  const result = await db.query(
    `UPDATE users SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${idx}
     RETURNING id, username, email, name, profile_picture, created_at`,
    params
  );
  const rows = result.rows;
  return rows[0] || null;
};

/**
 * Update user password
 */
const updateUserPassword = async (userId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const result = await db.query(
    "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id",
    [hashedPassword, userId]
  );

  return result.rowCount > 0;
};

/**
 * Soft delete user account
 */
const deleteUser = async (userId) => {
  const result = await db.query(
    "UPDATE users SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id",
    [userId]
  );
  return result.rowCount > 0;
};

/**
 * Check if username is available
 */
const isUsernameAvailable = async (username) => {
  const result = await db.query(
    "SELECT id FROM users WHERE username = $1 AND is_deleted = false",
    [username]
  );
  return result.rowCount === 0;
};

/**
 * Check if email is available
 */
const isEmailAvailable = async (email) => {
  const result = await db.query(
    "SELECT id FROM users WHERE email = $1 AND is_deleted = false",
    [email]
  );
  return result.rowCount === 0;
};

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  getUserByEmail,
  verifyPassword,
  findUsersByName,
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  deleteUser,
  isUsernameAvailable,
  isEmailAvailable,
};
