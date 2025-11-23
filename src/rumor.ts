import { Devvit, Post, TriggerContext } from "@devvit/public-api";
import { RUMOR_FLAIR_MESSAGE } from "./config.js";

// Check if post flair contains "rumor" and add sticky comment
export async function checkRumorFlair(
  post: Post,
  context: Devvit.Context | TriggerContext
): Promise<void> {
  try {
    const flair = post.flair?.text?.toLowerCase() || "";

    if (flair.includes("rumor")) {
      console.log(`Rumor flair detected on post ${post.id}`);

      // Check if we already commented on this post
      const key = `rumor_comment:${post.id}`;
      const alreadyCommented = await context.redis.get(key);

      if (alreadyCommented) {
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
    }
  } catch (error) {
    console.error(`Error checking rumor flair for post ${post.id}:`, error);
  }
}
