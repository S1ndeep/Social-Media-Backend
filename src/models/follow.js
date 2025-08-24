const db = require("../utils/database");

/**
 * Follow a user
 */
const followUser = async (followerId, followingId) => {
  // Check if users exist
  const [follower] = await db.execute(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [followerId]
  );
  
  const [following] = await db.execute(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [followingId]
  );
  
  if (follower.length === 0) {
    throw new Error("Follower user not found");
  }
  
  if (following.length === 0) {
    throw new Error("Following user not found");
  }

  // Check if already following
  const [existingFollow] = await db.execute(
    "SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2",
    [followerId, followingId]
  );
  
  if (existingFollow.length > 0) {
    throw new Error("Already following this user");
  }

  const [result] = await db.execute(
    "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) RETURNING *",
    [followerId, followingId]
  );
  
  return result[0];
};

/**
 * Unfollow a user
 */
const unfollowUser = async (followerId, followingId) => {
  const [result] = await db.execute(
    "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING *",
    [followerId, followingId]
  );
  
  if (result.length === 0) {
    throw new Error("Follow relationship not found");
  }
  
  return result[0];
};

/**
 * Check if a user is following another user
 */
const checkFollowExists = async (followerId, followingId) => {
  const [result] = await db.execute(
    "SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2",
    [followerId, followingId]
  );
  
  return result.length > 0;
};

/**
 * Get users that a user is following
 */
const getFollowing = async (userId, limit, offset) => {
  // Check if user exists
  const [user] = await db.execute(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [userId]
  );
  
  if (user.length === 0) {
    throw new Error("User not found");
  }

  const [following] = await db.execute(
    `SELECT u.id, u.username, u.name, u.profile_picture, f.created_at as followed_at
     FROM follows f
     INNER JOIN users u ON f.following_id = u.id
     WHERE f.follower_id = $1 AND u.is_deleted = false
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const [countResult] = await db.execute(
    "SELECT COUNT(*) FROM follows f INNER JOIN users u ON f.following_id = u.id WHERE f.follower_id = $1 AND u.is_deleted = false",
    [userId]
  );

  return {
    following,
    totalCount: parseInt(countResult[0].count)
  };
};

/**
 * Get users that are following a user
 */
const getFollowers = async (userId, limit, offset) => {
  // Check if user exists
  const [user] = await db.execute(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [userId]
  );
  
  if (user.length === 0) {
    throw new Error("User not found");
  }

  const [followers] = await db.execute(
    `SELECT u.id, u.username, u.name, u.profile_picture, f.created_at as followed_at
     FROM follows f
     INNER JOIN users u ON f.follower_id = u.id
     WHERE f.following_id = $1 AND u.is_deleted = false
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const [countResult] = await db.execute(
    "SELECT COUNT(*) FROM follows f INNER JOIN users u ON f.follower_id = u.id WHERE f.following_id = $1 AND u.is_deleted = false",
    [userId]
  );

  return {
    followers,
    totalCount: parseInt(countResult[0].count)
  };
};

/**
 * Get follow counts for a user
 */
const getFollowCounts = async (userId) => {
  // Check if user exists
  const [user] = await db.execute(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [userId]
  );
  
  if (user.length === 0) {
    throw new Error("User not found");
  }

  const [followerCount] = await db.execute(
    "SELECT COUNT(*) FROM follows f INNER JOIN users u ON f.follower_id = u.id WHERE f.following_id = $1 AND u.is_deleted = false",
    [userId]
  );

  const [followingCount] = await db.execute(
    "SELECT COUNT(*) FROM follows f INNER JOIN users u ON f.following_id = u.id WHERE f.follower_id = $1 AND u.is_deleted = false",
    [userId]
  );

  return {
    follower_count: parseInt(followerCount[0].count),
    following_count: parseInt(followingCount[0].count)
  };
};

/**
 * Get mutual follows (users who follow each other)
 */
const getMutualFollows = async (userId, limit, offset) => {
  // Check if user exists
  const [user] = await db.execute(
    "SELECT id FROM users WHERE id = $1 AND is_deleted = false",
    [userId]
  );
  
  if (user.length === 0) {
    throw new Error("User not found");
  }

  const [mutualFollows] = await db.execute(
    `SELECT u.id, u.username, u.name, u.profile_picture
     FROM follows f1
     INNER JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
     INNER JOIN users u ON f1.following_id = u.id
     WHERE f1.follower_id = $1 AND u.is_deleted = false
     ORDER BY f1.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const [countResult] = await db.execute(
    `SELECT COUNT(*)
     FROM follows f1
     INNER JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
     INNER JOIN users u ON f1.following_id = u.id
     WHERE f1.follower_id = $1 AND u.is_deleted = false`,
    [userId]
  );

  return {
    mutual_follows: mutualFollows,
    totalCount: parseInt(countResult[0].count)
  };
};

/**
 * Check if two users follow each other
 */
const checkMutualFollow = async (userId1, userId2) => {
  const [result] = await db.execute(
    `SELECT 
      EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2) as user1_follows_user2,
      EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = $1) as user2_follows_user1`,
    [userId1, userId2]
  );
  
  return {
    user1_follows_user2: result[0].user1_follows_user2,
    user2_follows_user1: result[0].user2_follows_user1,
    mutual_follow: result[0].user1_follows_user2 && result[0].user2_follows_user1
  };
};

module.exports = {
  followUser,
  unfollowUser,
  checkFollowExists,
  getFollowing,
  getFollowers,
  getFollowCounts,
  getMutualFollows,
  checkMutualFollow,
};