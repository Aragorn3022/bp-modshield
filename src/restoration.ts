import { Devvit, Post, Comment, TriggerContext } from "@devvit/public-api";
import {
  RESTORATION_MESSAGE,
  REDIS_KEYS,
  AUTO_APPROVAL_INTERVAL_DAYS,
} from "./config.js";
import {
  canSendNotification,
  markNotificationSent,
} from "./warnings.js";

// Check if enough time has passed since last auto-approval
async function canAutoApprove(context: TriggerContext | Devvit.Context): Promise<boolean> {
  const lastApprovalStr = await context.redis.get(REDIS_KEYS.LAST_AUTO_APPROVAL);
  
  if (!lastApprovalStr) {
    return true; // First time, allow approval
  }
  
  const lastApprovalTime = parseInt(lastApprovalStr, 10);
  const intervalMs = AUTO_APPROVAL_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  const timeSinceLastApproval = Date.now() - lastApprovalTime;
  
  return timeSinceLastApproval >= intervalMs;
}

// Mark that we performed auto-approval
async function markAutoApprovalDone(context: TriggerContext | Devvit.Context): Promise<void> {
  await context.redis.set(REDIS_KEYS.LAST_AUTO_APPROVAL, Date.now().toString());
}

// Check if content was removed by Reddit (spam filter) and restore it
export async function checkAndRestorePost(
  post: Post,
  context: TriggerContext | Devvit.Context
): Promise<void> {
  try {
    // Check if this post was already processed
    const processedKey = REDIS_KEYS.PROCESSED_ITEMS(post.id);
    const alreadyProcessed = await context.redis.get(processedKey);
    
    if (alreadyProcessed) {
      return; // Already handled this item
    }

    // Check if post is removed
    if (post.removed) {
      // Check if we can auto-approve (5-6 day interval)
      const canApprove = await canAutoApprove(context);
      
      if (!canApprove) {
        console.log(`Skipping auto-approval for post ${post.id} - waiting for approval interval`);
        return;
      }
      
      // Approve the post
      await post.approve();
      console.log(`Auto-approved post ${post.id} by u/${post.authorName}`);
      
      // Mark that we performed auto-approval
      await markAutoApprovalDone(context);

      // Check if we should notify the user
      if (await canSendNotification(context, post.authorName || "")) {
        const message = RESTORATION_MESSAGE(post.authorName || "user", "post");
        await post.addComment({
          text: message,
        });
        await markNotificationSent(context, post.authorName || "");
      }

      // Action is tracked via Reddit's mod actions log automatically
    }

    // Mark as processed
    await context.redis.set(processedKey, "1", { expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
  } catch (error) {
    console.error(`Error restoring post ${post.id}:`, error);
  }
}

// Check if content was removed by Reddit (spam filter) and restore it
export async function checkAndRestoreComment(
  comment: Comment,
  context: TriggerContext | Devvit.Context
): Promise<void> {
  try {
    // Check if this comment was already processed
    const processedKey = REDIS_KEYS.PROCESSED_ITEMS(comment.id);
    const alreadyProcessed = await context.redis.get(processedKey);
    
    if (alreadyProcessed) {
      return; // Already handled this item
    }

    // Check if comment is removed
    if (comment.removed) {
      // Check if we can auto-approve (5-6 day interval)
      const canApprove = await canAutoApprove(context);
      
      if (!canApprove) {
        console.log(`Skipping auto-approval for comment ${comment.id} - waiting for approval interval`);
        return;
      }
      
      // Approve it
      await comment.approve();
      console.log(`Auto-approved comment ${comment.id} by u/${comment.authorName}`);
      
      // Mark that we performed auto-approval
      await markAutoApprovalDone(context);

      // Check if we should notify the user
      if (await canSendNotification(context, comment.authorName || "")) {
        const message = RESTORATION_MESSAGE(comment.authorName || "user", "comment");
        await comment.reply({
          text: message,
        });
        await markNotificationSent(context, comment.authorName || "");
      }

      // Action is tracked via Reddit's mod actions log automatically
    }

    // Mark as processed
    await context.redis.set(processedKey, "1", { expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
  } catch (error) {
    console.error(`Error restoring comment ${comment.id}:`, error);
  }
}
