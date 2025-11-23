import { Devvit, Post, TriggerContext } from "@devvit/public-api";
import { RUMOR_FLAIR_MESSAGE } from "./config.js";

// Check if post flair or title contains "rumor" and add sticky comment
export async function checkRumorFlair(
  post: Post,
  context: Devvit.Context | TriggerContext
): Promise<void> {
  try {
    const flair = post.flair?.text?.toLowerCase() || "";
    const title = post.title?.toLowerCase() || "";
    const key = `rumor_comment:${post.id}`;

    // Check if either flair or title contains "rumor" or "rumour"
    const hasRumorInFlair = flair.includes("rumor") || flair.includes("rumour");
    const hasRumorInTitle = title.includes("rumor") || title.includes("rumour");

    if (hasRumorInFlair || hasRumorInTitle) {
      console.log(`Rumor detected on post ${post.id} (flair: ${hasRumorInFlair}, title: ${hasRumorInTitle})`);

      // Check if we already commented on this post
      const alreadyCommented = await context.redis.get(key);

      if (alreadyCommented) {
        console.log(`Already commented on post ${post.id}, skipping`);
        return; // Already added comment
      }

      // Add stickied and locked comment
      const comment = await post.addComment({
        text: RUMOR_FLAIR_MESSAGE,
      });

      // Sticky and lock the comment
      await comment.distinguish(true); // true = sticky
      await comment.lock();

      // Mark as done
      await context.redis.set(key, "1", {
        expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      });

      console.log(`Added rumor warning to post ${post.id}`);
    } else {
      // Neither flair nor title contains "rumor" - clear the Redis key if it exists
      // This allows the bot to comment again if the rumor flair/title is re-added
      const hadKey = await context.redis.get(key);
      if (hadKey) {
        await context.redis.del(key);
        console.log(`Cleared rumor comment flag for post ${post.id} (rumor text removed)`);
      }
    }
  } catch (error) {
    console.error(`Error checking rumor flair for post ${post.id}:`, error);
  }
}
