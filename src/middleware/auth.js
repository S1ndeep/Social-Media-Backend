const { verifyToken } = require("../utils/jwt");
const { getUserById } = require("../models/user");
const logger = require("../utils/logger");

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    
    if (!authHeader) {
      return res.status(401).json({ error: "Access token required" });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const decoded = verifyToken(token);

    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.critical("Authentication error:", error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: "Token expired" });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: "Invalid token" });
    }
    
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

/**
 * Middleware to optionally authenticate tokens (for endpoints that work with/without auth)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    
    if (authHeader) {
      // Extract token from "Bearer <token>" format
      const token = authHeader.startsWith("Bearer ") 
        ? authHeader.substring(7) 
        : authHeader;

      if (token) {
        const decoded = verifyToken(token);
        const user = await getUserById(decoded.userId);
        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

/**
 * Middleware to check if user is the owner of a resource
 */
const requireOwnership = (resourceOwnerIdField = 'user_id') => {
  return (req, res, next) => {
    try {
      // For routes where the resource ID is in params
      const resourceId = req.params.id || req.params.userId || req.params.postId;
      
      if (!resourceId) {
        return res.status(400).json({ error: "Resource ID required" });
      }

      // Check if the current user owns the resource
      if (req.user.id !== parseInt(resourceId)) {
        return res.status(403).json({ error: "Access denied. You do not own this resource." });
      }

      next();
    } catch (error) {
      logger.critical("Ownership check error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware to check if user is authenticated and is the same as the target user
 */
const requireSameUser = (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    
    if (req.user.id !== targetUserId) {
      return res.status(403).json({ error: "Access denied. You can only access your own data." });
    }

    next();
  } catch (error) {
    logger.critical("Same user check error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireOwnership,
  requireSameUser,
};