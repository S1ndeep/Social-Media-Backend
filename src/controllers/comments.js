const {
  createComment: createCommentModel,
  getCommentById,
  updateComment: updateCommentModel,
  deleteComment: deleteCommentModel,
  getCommentsByPostId,
  checkCommentsEnabled,
} = require("../models/comment");
const logger = require("../utils/logger");

/**
 * Create a new comment on a post
 */
const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // ✅ fixed: use req.user.id

    const commentsEnabled = await checkCommentsEnabled(postId);
    if (!commentsEnabled) {
      return res.status(400).json({ error: "Comments are disabled for this post" });
    }

    const comment = await createCommentModel(userId, postId, content);

    logger.verbose(`User ${userId} commented on post ${postId}`);

    res.status(201).json({
      message: "Comment created successfully",
      comment,
    });
  } catch (error) {
    if (error.message === "Post not found") {
      return res.status(404).json({ error: "Post not found" });
    }
    logger.critical("Create comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Update a user's own comment
 */
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // ✅ fixed

    const comment = await getCommentById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    if (comment.user_id !== userId) return res.status(403).json({ error: "Not authorized" });

    const updatedComment = await updateCommentModel(commentId, content);

    logger.verbose(`User ${userId} updated comment ${commentId}`);

    res.json({
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    logger.critical("Update comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Delete a user's own comment (soft delete)
 */
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id; // ✅ fixed

    const comment = await getCommentById(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    if (comment.user_id !== userId) return res.status(403).json({ error: "Not authorized" });

    await deleteCommentModel(commentId);

    logger.verbose(`User ${userId} deleted comment ${commentId}`);

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    logger.critical("Delete comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get comments for a post with pagination
 */
const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { comments, totalCount } = await getCommentsByPostId(postId, limit, offset);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      comments,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_comments: totalCount,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    });
  } catch (error) {
    if (error.message === "Post not found") {
      return res.status(404).json({ error: "Post not found" });
    }
    logger.critical("Get post comments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createComment,
  updateComment,
  deleteComment,
  getPostComments,
};
