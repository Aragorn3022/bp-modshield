import { Devvit, Post, Comment, TriggerContext } from "@devvit/public-api";
import { REDIS_KEYS } from "./config.js";

export type ParticipationRequirements = {
  minKarma: number;
  minAccountAge: number; // in days
  enabled: boolean;
};

// Check if user meets participation requirements
export async function checkParticipationRequirements(
  context: Devvit.Context | TriggerContext,
  username: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Check if restrictions are enabled
    const enabledStr = await context.redis.get(REDIS_KEYS.RESTRICTIONS_ENABLED);
    const enabled = enabledStr === "true";

    if (!enabled) {
      return { allowed: true };
    }

    // Get requirements
    const karmaStr = await context.redis.get(REDIS_KEYS.KARMA_REQUIREMENT);
    const ageStr = await context.redis.get(REDIS_KEYS.ACCOUNT_AGE_REQUIREMENT);

    const minKarma = karmaStr ? parseInt(karmaStr, 10) : 0;
    const minAccountAge = ageStr ? parseInt(ageStr, 10) : 0;

    // Get user info
    const user = await context.reddit.getUserById(username);
    if (!user) {
      return { allowed: false, reason: "Could not fetch user information" };
    }

    // Check karma
    const userKarma = (user.commentKarma || 0) + (user.linkKarma || 0);
    if (userKarma < minKarma) {
      return {
        allowed: false,
        reason: `Your account needs at least ${minKarma} karma to participate. You currently have ${userKarma} karma.`,
      };
    }

    // Check account age
    const accountAgeMs = Date.now() - user.createdAt.getTime();
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

    if (accountAgeDays < minAccountAge) {
      return {
        allowed: false,
        reason: `Your account needs to be at least ${minAccountAge} days old to participate. Your account is ${accountAgeDays} days old.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("Error checking participation requirements:", error);
    return { allowed: true }; // Default to allowing on error
  }
}

// Handle post that doesn't meet requirements
export async function handleInsufficientPost(
  post: Post,
  context: Devvit.Context | TriggerContext,
  reason: string
): Promise<void> {
  try {
    await post.remove();
    await post.addComment({
      text: `Your post was automatically removed.\n\n${reason}\n\nPlease try again once you meet the requirements.`,
    });

    // Action is tracked via Reddit's mod actions log automatically
  } catch (error) {
    console.error(`Error handling insufficient post ${post.id}:`, error);
  }
}

// Handle comment that doesn't meet requirements
export async function handleInsufficientComment(
  comment: Comment,
  context: Devvit.Context | TriggerContext,
  reason: string
): Promise<void> {
  try {
    await comment.remove();
    await comment.reply({
      text: `Your comment was automatically removed.\n\n${reason}\n\nPlease try again once you meet the requirements.`,
    });

    // Action is tracked via Reddit's mod actions log automatically
  } catch (error) {
    console.error(`Error handling insufficient comment ${comment.id}:`, error);
  }
}

// Get current requirements
export async function getParticipationRequirements(
  context: Devvit.Context
): Promise<ParticipationRequirements> {
  const enabledStr = await context.redis.get(REDIS_KEYS.RESTRICTIONS_ENABLED);
  const karmaStr = await context.redis.get(REDIS_KEYS.KARMA_REQUIREMENT);
  const ageStr = await context.redis.get(REDIS_KEYS.ACCOUNT_AGE_REQUIREMENT);

  return {
    enabled: enabledStr === "true",
    minKarma: karmaStr ? parseInt(karmaStr, 10) : 0,
    minAccountAge: ageStr ? parseInt(ageStr, 10) : 0,
  };
}

// Update requirements
export async function updateParticipationRequirements(
  context: Devvit.Context,
  requirements: ParticipationRequirements
): Promise<void> {
  await context.redis.set(
    REDIS_KEYS.RESTRICTIONS_ENABLED,
    requirements.enabled ? "true" : "false"
  );
  await context.redis.set(
    REDIS_KEYS.KARMA_REQUIREMENT,
    requirements.minKarma.toString()
  );
  await context.redis.set(
    REDIS_KEYS.ACCOUNT_AGE_REQUIREMENT,
    requirements.minAccountAge.toString()
  );
}
