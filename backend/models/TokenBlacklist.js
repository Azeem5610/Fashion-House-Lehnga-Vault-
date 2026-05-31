const mongoose = require("mongoose");

/**
 * TokenBlacklist — stores revoked JWT tokens until they naturally expire.
 * Uses a TTL index so MongoDB auto-deletes documents after `expiresAt`,
 * keeping the collection lean with no manual cleanup needed.
 */
const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  // expiresAt must match the JWT's own expiry so the TTL index auto-purges it
  expiresAt: {
    type: Date,
    required: true,
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  revokedAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index — MongoDB removes documents automatically when expiresAt is reached
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("TokenBlacklist", tokenBlacklistSchema);
