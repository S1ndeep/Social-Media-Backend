const db = require("../utils/database");

// Follow a user
const followUser = async (req, res) => {
  try {
    const followerId = req.user.id;          // from JWT
    const { userId: followingId } = req.body;

    if (followerId === followingId) {
      return res.status(400).json({ message: "Cannot follow yourself." });
    }

    const existsResult = await db.query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [followerId, followingId]
    );

    if (existsResult.rows.length > 0) {
      return res.status(400).json({ message: "Already following this user." });
    }

    const insertResult = await db.query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) RETURNING *",
      [followerId, followingId]
    );

    res.json({ message: "User followed successfully.", data: insertResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Unfollow a user
const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { userId: followingId } = req.body;

    const existsResult = await db.query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [followerId, followingId]
    );

    if (existsResult.rows.length === 0) {
      return res.status(400).json({ message: "Not following this user." });
    }

    await db.query(
      "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
      [followerId, followingId]
    );

    res.json({ message: "User unfollowed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get users current user follows
const getFollowing = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const result = await db.query(
      `SELECT u.id, u.username, u.name, u.profile_picture
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1 AND u.is_deleted = false
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({ following: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get users following current user
const getFollowers = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const result = await db.query(
      `SELECT u.id, u.username, u.name, u.profile_picture
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1 AND u.is_deleted = false
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({ followers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get follow stats
const getFollowStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const followerResult = await db.query(
      "SELECT COUNT(*) FROM follows WHERE following_id = $1",
      [userId]
    );
    const followingResult = await db.query(
      "SELECT COUNT(*) FROM follows WHERE follower_id = $1",
      [userId]
    );

    res.json({
      followers: parseInt(followerResult.rows[0].count),
      following: parseInt(followingResult.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const query = req.query.query || "";
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const searchTerm = `%${query}%`;

    const result = await db.query(
      `SELECT id, username, name, profile_picture
       FROM users
       WHERE (username ILIKE $1 OR name ILIKE $1) AND is_deleted = false
       ORDER BY username
       LIMIT $2 OFFSET $3`,
      [searchTerm, limit, offset]
    );

    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a single user by ID
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      "SELECT id, username, email, name, profile_picture, created_at FROM users WHERE id = $1 AND is_deleted = false",
      [userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  getFollowStats,
  searchUsers,
  getUserById,
};
