import { Devvit, TriggerContext } from "@devvit/public-api";

export type UserWarning = {
  timestamp: number;
  postId?: string;
  commentId?: string;
  moderator: string;
  reason: string;
};

export type UserWarningRecord = {
  warnings: UserWarning[];
  totalWarnings: number;
  lastBanLevel: number; // 0, 1, 2, 3 for no ban, first, second, perma
};

// Add a warning to a user
export async function addWarning(
  context: Devvit.Context | TriggerContext,
  username: string,
  warning: UserWarning
): Promise<UserWarningRecord> {
  const key = `warnings:${username}`;
  const existing = await context.redis.get(key);
  
  let record: UserWarningRecord;
  if (existing) {
    record = JSON.parse(existing);
  } else {
    record = {
      warnings: [],
      totalWarnings: 0,
      lastBanLevel: 0,
    };
  }
  
  record.warnings.push(warning);
  record.totalWarnings++;
  
  // Clean up expired warnings (older than 90 days)
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  record.warnings = record.warnings.filter(w => w.timestamp > ninetyDaysAgo);
  
  await context.redis.set(key, JSON.stringify(record));
  return record;
}

// Get user warnings
export async function getUserWarnings(
  context: Devvit.Context | TriggerContext,
  username: string
): Promise<UserWarningRecord> {
  const key = `warnings:${username}`;
  const existing = await context.redis.get(key);
  
  if (!existing) {
    return {
      warnings: [],
      totalWarnings: 0,
      lastBanLevel: 0,
    };
  }
  
  const record: UserWarningRecord = JSON.parse(existing);
  
  // Clean up expired warnings
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  record.warnings = record.warnings.filter(w => w.timestamp > ninetyDaysAgo);
  
  return record;
}

// Remove a warning (when content is reinstated)
export async function removeWarning(
  context: Devvit.Context | TriggerContext,
  username: string,
  contentId: string
): Promise<void> {
  const key = `warnings:${username}`;
  const existing = await context.redis.get(key);
  
  if (!existing) return;
  
  const record: UserWarningRecord = JSON.parse(existing);
  record.warnings = record.warnings.filter(
    w => w.postId !== contentId && w.commentId !== contentId
  );
  
  await context.redis.set(key, JSON.stringify(record));
}

// Check if user should be banned and return ban info
export function checkBanThreshold(warningCount: number, lastBanLevel: number): {
  shouldBan: boolean;
  banDays: number | null;
  banLevel: number;
  message: string;
} {
  if (warningCount >= 26 && lastBanLevel < 3) {
    return {
      shouldBan: true,
      banDays: null, // permanent
      banLevel: 3,
      message: "You've exceeded our internal threshold of allowed removals in a specific time. For more details, please look at your previous removal messages.",
    };
  } else if (warningCount >= 12 && lastBanLevel < 2) {
    return {
      shouldBan: true,
      banDays: 28,
      banLevel: 2,
      message: "You've exceeded our internal threshold of allowed removals in a specific time. For more details, please look at your previous removal messages.",
    };
  } else if (warningCount >= 6 && lastBanLevel < 1) {
    return {
      shouldBan: true,
      banDays: 7,
      banLevel: 1,
      message: "You've exceeded our internal threshold of allowed removals in a specific time. For more details, please look at your previous removal messages.",
    };
  }
  
  return {
    shouldBan: false,
    banDays: 0,
    banLevel: lastBanLevel,
    message: "",
  };
}

// Apply ban to user and update ban level
export async function applyBan(
  context: Devvit.Context | TriggerContext,
  username: string,
  subredditName: string,
  banDays: number | null,
  reason: string,
  newBanLevel: number
): Promise<void> {
  try {
    console.log(`Attempting to ban u/${username} for ${banDays || 'permanent'} days. Reason: ${reason}`);
    
    if (banDays === null) {
      // Permanent ban
      await context.reddit.banUser({
        username,
        subredditName,
        reason,
        note: "Automatic ban by ModShield bot",
      });
      console.log(`Successfully banned u/${username} permanently`);
    } else {
      // Temporary ban
      await context.reddit.banUser({
        username,
        subredditName,
        duration: banDays,
        reason,
        note: "Automatic ban by ModShield bot",
      });
      console.log(`Successfully banned u/${username} for ${banDays} days`);
    }
    
    // Update last ban level
    const key = `warnings:${username}`;
    const existing = await context.redis.get(key);
    if (existing) {
      const record: UserWarningRecord = JSON.parse(existing);
      record.lastBanLevel = newBanLevel;
      await context.redis.set(key, JSON.stringify(record));
      console.log(`Updated ban level for u/${username} to ${newBanLevel}`);
    }
  } catch (error) {
    console.error(`Failed to ban user ${username}:`, error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
  }
}

// Check if enough time has passed to send notification
export async function canSendNotification(
  context: Devvit.Context | TriggerContext,
  username: string
): Promise<boolean> {
  const key = `last_notif:${username}`;
  const lastNotif = await context.redis.get(key);
  
  if (!lastNotif) return true;
  
  const lastNotifTime = parseInt(lastNotif, 10);
  const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
  
  return lastNotifTime < fiveDaysAgo;
}

// Mark that we sent a notification
export async function markNotificationSent(
  context: Devvit.Context | TriggerContext,
  username: string
): Promise<void> {
  const key = `last_notif:${username}`;
  await context.redis.set(key, Date.now().toString());
}

// Get warning counts (active and expired)
export async function getWarningCounts(
  context: Devvit.Context | TriggerContext,
  username: string
): Promise<{ active: number; expired: number; total: number }> {
  const record = await getUserWarnings(context, username);
  
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  const activeWarnings = record.warnings.filter(w => w.timestamp > ninetyDaysAgo);
  const expiredCount = record.totalWarnings - activeWarnings.length;
  
  return {
    active: activeWarnings.length,
    expired: expiredCount > 0 ? expiredCount : 0,
    total: record.totalWarnings,
  };
}
