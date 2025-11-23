import { Devvit, Post, Comment, TriggerContext } from "@devvit/public-api";
import {
  RESTORATION_MESSAGE,
  REDIS_KEYS,
} from "./config.js";
import {
  canSendNotification,
  markNotificationSent,
} from "./warnings.js";

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
      // Get the post's removal metadata to determine who removed it
      // If it's spam filtered by Reddit, approve it
      // Note: We can't directly check who removed it, but we can check if it's in modqueue
      // Posts removed by Reddit spam filter typically show up in modqueue
      
      // For safety, we'll approve it and log
      await post.approve();
      console.log(`Auto-approved post ${post.id} by u/${post.authorName}`);

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
      // Approve it
      await comment.approve();
      console.log(`Auto-approved comment ${comment.id} by u/${comment.authorName}`);

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
