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

// Default removal reasons based on subreddit rules
export const DEFAULT_REMOVAL_REASONS: RemovalReason[] = [
  {
    id: "blackpink_related",
    label: 'Breaks "Keep things Blackpink related"',
    reasonText: "Keep things Blackpink related - Please stay on topic of the group, it's members, fans and anything directly related to them.",
  },
  {
    id: "respectful",
    label: 'Breaks "Stay respectful to everyone"',
    reasonText: "Stay respectful to everyone - We want to keep things respectful for everyone, including the mods. State your opposite opinion in a respectful manner without insults, name-calling, or derogatory terms. Don't target people for their opinions, background, or identity. Don't participate in harassment towards anyone, including the family of Blackpink's members.",
  },
  {
    id: "threats",
    label: 'Breaks "No threats of any kind"',
    reasonText: "No threats of any kind - We will not stand for threats of any kind towards anyone, including sexual assault insinuations/jokes, or threats of body harm. Don't threaten to hurt someone, wish they did, or encourage self-harm or suicide.",
  },
  {
    id: "pii",
    label: 'Breaks "No sharing of PII"',
    reasonText: "No sharing of PII (Personally Identifiable Information) - We don't allow sharing of personally identifiable information including phone numbers, home addresses, email addresses, private photos (school, houses, sexually explicit images), or real life names.",
  },
  {
    id: "hate_speech",
    label: 'Breaks "No hate speech of any kind"',
    reasonText: "No hate speech of any kind - We don't allow hate speech including misogyny and slut shaming, racism/xenophobia, or transphobia. Don't critique someone because of their gender or use terms solely like 'stripper' or 'bitch'. Share opinions based on style and presentation rather than personal attacks.",
  },
  {
    id: "body_shaming",
    label: 'Breaks "No body shaming"',
    reasonText: "No body shaming of any kind - We don't allow body shaming about anyone including shaming characteristics someone was born with, making fun of someone's body shape, skin color, features, or jokes about weight.",
  },
  {
    id: "fan_behavior",
    label: 'Breaks "No fan behavior of any kind"',
    reasonText: "No fan behavior of any kind - We don't allow comments/posts defending Blackpink or one of the members without any reason or logic. Only praising Blackpink falls under this. Critiquing and every-so-often praising is allowed.",
  },
  {
    id: "blur_names",
    label: 'Breaks "Blur names in screenshots/recordings"',
    reasonText: "Blur names in screenshots/recordings - Please censor the username or any identifying information when sharing screenshots/recordings, except for official accounts, celebrities, brands, companies, or publications.",
  },
  {
    id: "gatekeeping",
    label: 'Breaks "Don\'t make gate keeping or meta posts"',
    reasonText: "Don't make gate keeping or meta posts/comments - We do not allow gatekeeping or attempts to control discussions. Don't try to dictate what topics or opinions are allowed, tell others what they can or cannot discuss, or police conversations. If you have concerns, reach out to the mods.",
  },
  {
    id: "creepy",
    label: 'Breaks "No creepy or inappropriate behavior"',
    reasonText: "No creepy or inappropriate behavior of any kind - Refrain from making inappropriate or creepy comments including saying you'd like a member as your partner/spouse, jokes about relationships, sexualizing or objectifying members, posting manipulated/suggestive images, or OnlyFans references.",
  },
  {
    id: "ai",
    label: 'Breaks "No AI"',
    reasonText: "No AI content - We don't allow AI-generated content in posts or comments.",
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
          banInfo.message,
          banInfo.banLevel
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
      note: `Post removed by u/${moderator}: ${reason.label}`,
      redditId: post.id,
    });

    // Action is tracked via Reddit's mod actions log automatically
    console.log(`Mod action logged: Post ${post.id} removed by u/${moderator} for ${reason.label}`);

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
          banInfo.message,
          banInfo.banLevel
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
      note: `Comment removed by u/${moderator}: ${reason.label}`,
      redditId: comment.id,
    });

    // Action is tracked via Reddit's mod actions log automatically
    console.log(`Mod action logged: Comment ${comment.id} removed by u/${moderator} for ${reason.label}`);

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
