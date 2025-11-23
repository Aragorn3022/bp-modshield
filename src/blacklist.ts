import { Devvit, Post, Comment, TriggerContext } from "@devvit/public-api";
import {
  DEFAULT_BLACKLIST,
  BLACKLIST_REMOVAL_MESSAGE,
  REDIS_KEYS,
  containsBlacklistedWord,
  SUBREDDIT_NAME,
} from "./config.js";
import { getWarningCounts, addWarning, checkBanThreshold, applyBan, getUserWarnings } from "./warnings.js";

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
        
        // Check if user should be banned
        const userWarningRecord = await getUserWarnings(context, post.authorName);
        const warningRecord = await getWarningCounts(context, post.authorName);
        console.log(`User ${post.authorName} has ${warningRecord.active} active warnings (lastBanLevel: ${userWarningRecord.lastBanLevel})`);
        
        const banInfo = checkBanThreshold(
          warningRecord.active,
          userWarningRecord.lastBanLevel
        );
        
        console.log(`Ban check result for ${post.authorName}: shouldBan=${banInfo.shouldBan}, banDays=${banInfo.banDays}, banLevel=${banInfo.banLevel}`);

        if (banInfo.shouldBan) {
          await applyBan(
            context,
            post.authorName,
            SUBREDDIT_NAME,
            banInfo.banDays,
            banInfo.message
          );
          console.log(`Banned u/${post.authorName}: ${banInfo.message}`);
        }
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

      // Mod log entry (modLog requires special permissions)
      // Action is tracked via Redis and visible in mod actions
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
        
        // Check if user should be banned
        const userWarningRecord = await getUserWarnings(context, comment.authorName);
        const warningRecord = await getWarningCounts(context, comment.authorName);
        console.log(`User ${comment.authorName} has ${warningRecord.active} active warnings (lastBanLevel: ${userWarningRecord.lastBanLevel})`);
        
        const banInfo = checkBanThreshold(
          warningRecord.active,
          userWarningRecord.lastBanLevel
        );
        
        console.log(`Ban check result for ${comment.authorName}: shouldBan=${banInfo.shouldBan}, banDays=${banInfo.banDays}, banLevel=${banInfo.banLevel}`);

        if (banInfo.shouldBan) {
          await applyBan(
            context,
            comment.authorName,
            SUBREDDIT_NAME,
            banInfo.banDays,
            banInfo.message
          );
          console.log(`Banned u/${comment.authorName}: ${banInfo.message}`);
        }
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

      // Mod log entry (modLog requires special permissions)
      // Action is tracked via Redis and visible in mod actions
    }
  } catch (error) {
    console.error(`Error checking blacklist for comment ${comment.id}:`, error);
  }
}
