import { Devvit, Post, Comment } from "@devvit/public-api";
import {
  MANUAL_REMOVAL_MESSAGE,
  SUBREDDIT_NAME,
} from "./config.js";
import {
  addWarning,
  checkBanThreshold,
  applyBan,
  getWarningCounts,
} from "./warnings.js";

export type RemovalReason = {
  id: string;
  label: string;
  reasonText: string;
};

// Default removal reasons (will be customizable later)
export const DEFAULT_REMOVAL_REASONS: RemovalReason[] = [
  {
    id: "spam",
    label: "Spam",
    reasonText: "Your content was removed because it was identified as spam.",
  },
  {
    id: "harassment",
    label: "Harassment",
    reasonText: "Your content was removed for harassment or bullying.",
  },
  {
    id: "offtopic",
    label: "Off-topic",
    reasonText: "Your content was removed because it was off-topic.",
  },
];

// Handle custom removal of a post
export async function handleCustomRemovalPost(
  post: Post,
  context: Devvit.Context,
  reason: RemovalReason,
  addWarningToUser: boolean,
  moderator: string
): Promise<void> {
  try {
    // Remove the post
    await post.remove();

    // Add warning if requested (do this before getting counts so the new warning is included)
    if (addWarningToUser && post.authorName) {
      const warningRecord = await addWarning(context, post.authorName, {
        timestamp: Date.now(),
        postId: post.id,
        moderator,
        reason: reason.label,
      });

      // Check if user should be banned
      const banInfo = checkBanThreshold(
        warningRecord.warnings.length,
        warningRecord.lastBanLevel
      );

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

    // Get warning counts for the message
    const warningCounts = post.authorName 
      ? await getWarningCounts(context, post.authorName)
      : { active: 0, expired: 0, total: 0 };

    // Add reply with reason including warning counts
    const message = MANUAL_REMOVAL_MESSAGE(
      post.authorName || "user",
      reason.reasonText,
      warningCounts.active,
      warningCounts.expired
    );
    const comment = await post.addComment({
      text: message,
    });

    // Sticky and lock the reply
    await comment.distinguish(true); // true = sticky
    await comment.lock();

    // Add mod note
    await context.reddit.addModNote({
      subreddit: SUBREDDIT_NAME,
      user: post.authorName || "",
      note: `Post removed: ${reason.label}`,
      redditId: post.id,
    });

    // Add to mod log
    await context.modLog.add({
      action: "removelink",
      target: post.id,
      details: reason.id,
      description: `Removed by u/${moderator}: ${reason.label}`,
    });

    console.log(`Custom removal of post ${post.id} by u/${moderator} for: ${reason.label}`);
  } catch (error) {
    console.error(`Error in custom removal for post ${post.id}:`, error);
    throw error;
  }
}

// Handle custom removal of a comment
export async function handleCustomRemovalComment(
  comment: Comment,
  context: Devvit.Context,
  reason: RemovalReason,
  addWarningToUser: boolean,
  moderator: string
): Promise<void> {
  try {
    // Remove the comment
    await comment.remove();

    // Add warning if requested (do this before getting counts so the new warning is included)
    if (addWarningToUser && comment.authorName) {
      const warningRecord = await addWarning(context, comment.authorName, {
        timestamp: Date.now(),
        commentId: comment.id,
        moderator,
        reason: reason.label,
      });

      // Check if user should be banned
      const banInfo = checkBanThreshold(
        warningRecord.warnings.length,
        warningRecord.lastBanLevel
      );

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

    // Get warning counts for the message
    const warningCounts = comment.authorName 
      ? await getWarningCounts(context, comment.authorName)
      : { active: 0, expired: 0, total: 0 };

    // Add reply with reason including warning counts
    const message = MANUAL_REMOVAL_MESSAGE(
      comment.authorName || "user",
      reason.reasonText,
      warningCounts.active,
      warningCounts.expired
    );
    const reply = await comment.reply({
      text: message,
    });

    // Sticky and lock the reply
    await reply.distinguish(true); // true = sticky
    await reply.lock();

    // Add mod note
    await context.reddit.addModNote({
      subreddit: SUBREDDIT_NAME,
      user: comment.authorName || "",
      note: `Comment removed: ${reason.label}`,
      redditId: comment.id,
    });

    // Add to mod log
    await context.modLog.add({
      action: "removecomment",
      target: comment.id,
      details: reason.id,
      description: `Removed by u/${moderator}: ${reason.label}`,
    });

    console.log(`Custom removal of comment ${comment.id} by u/${moderator} for: ${reason.label}`);
  } catch (error) {
    console.error(`Error in custom removal for comment ${comment.id}:`, error);
    throw error;
  }
}

// Get removal reasons from Redis or use defaults
export async function getRemovalReasons(context: Devvit.Context): Promise<RemovalReason[]> {
  const key = "removal_reasons";
  const stored = await context.redis.get(key);
  
  if (stored) {
    return JSON.parse(stored);
  }
  
  return DEFAULT_REMOVAL_REASONS;
}
