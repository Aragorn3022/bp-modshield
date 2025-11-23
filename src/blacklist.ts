import { Devvit, Post, Comment, TriggerContext } from "@devvit/public-api";
import {
  DEFAULT_BLACKLIST,
  BLACKLIST_REMOVAL_MESSAGE,
  REDIS_KEYS,
  containsBlacklistedWord,
} from "./config.js";
import { getWarningCounts, addWarning } from "./warnings.js";

// Check and handle blacklisted content in posts
export async function checkBlacklistPost(
  post: Post,
  context: TriggerContext | Devvit.Context
): Promise<void> {
  try {
    // Get blacklist from Redis (or use default)
    const blacklistStr = await context.redis.get(REDIS_KEYS.BLACKLIST);
    const blacklist = blacklistStr ? JSON.parse(blacklistStr) : DEFAULT_BLACKLIST;

    const title = post.title || "";
    const body = post.body || "";
    const fullText = `${title} ${body}`;

    if (containsBlacklistedWord(fullText, blacklist)) {
      console.log(`Blacklisted word found in post ${post.id} by u/${post.authorName}`);
      
      // Add warning first
      if (post.authorName) {
        await addWarning(context, post.authorName, {
          timestamp: Date.now(),
          postId: post.id,
          moderator: "AutoMod",
          reason: "Blacklisted word",
        });
      }
      
      // Get warning counts
      const warningCounts = post.authorName 
        ? await getWarningCounts(context, post.authorName)
        : { active: 0, expired: 0, total: 0 };
      
      // Remove the post
      await post.remove();

      // Reply with removal message including warning counts
      const message = BLACKLIST_REMOVAL_MESSAGE(
        post.authorName || "user",
        warningCounts.active,
        warningCounts.expired
      );
      await post.addComment({
        text: message,
      });

      // Add to mod log (only available in non-trigger contexts)
      if ('modLog' in context) {
        await context.modLog.add({
          action: "removelink",
          target: post.id,
          details: "blacklist-filter",
          description: `Automatically removed due to blacklisted word`,
        });
      }
    }
  } catch (error) {
    console.error(`Error checking blacklist for post ${post.id}:`, error);
  }
}

// Check and handle blacklisted content in comments
export async function checkBlacklistComment(
  comment: Comment,
  context: TriggerContext | Devvit.Context
): Promise<void> {
  try {
    // Get blacklist from Redis (or use default)
    const blacklistStr = await context.redis.get(REDIS_KEYS.BLACKLIST);
    const blacklist = blacklistStr ? JSON.parse(blacklistStr) : DEFAULT_BLACKLIST;

    const body = comment.body || "";

    if (containsBlacklistedWord(body, blacklist)) {
      console.log(`Blacklisted word found in comment ${comment.id} by u/${comment.authorName}`);
      
      // Add warning first
      if (comment.authorName) {
        await addWarning(context, comment.authorName, {
          timestamp: Date.now(),
          commentId: comment.id,
          moderator: "AutoMod",
          reason: "Blacklisted word",
        });
      }
      
      // Get warning counts
      const warningCounts = comment.authorName 
        ? await getWarningCounts(context, comment.authorName)
        : { active: 0, expired: 0, total: 0 };
      
      // Remove the comment
      await comment.remove();

      // Reply with removal message including warning counts
      const message = BLACKLIST_REMOVAL_MESSAGE(
        comment.authorName || "user",
        warningCounts.active,
        warningCounts.expired
      );
      await comment.reply({
        text: message,
      });

      // Add to mod log (only available in non-trigger contexts)
      if ('modLog' in context) {
        await context.modLog.add({
          action: "removecomment",
          target: comment.id,
          details: "blacklist-filter",
          description: `Automatically removed due to blacklisted word`,
        });
      }
    }
  } catch (error) {
    console.error(`Error checking blacklist for comment ${comment.id}:`, error);
  }
}
