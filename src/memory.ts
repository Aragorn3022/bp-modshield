import { Devvit } from "@devvit/public-api";

/**
 * Clear all bot memory from Redis
 * This will remove all warnings, processed items, notifications, etc.
 */
export async function clearAllMemory(context: Devvit.Context): Promise<{
  success: boolean;
  keysDeleted: number;
  message: string;
}> {
  try {
    console.log("Starting memory clear operation...");
    
    // Common Redis key patterns used by the bot
    const keyPatterns = [
      "warnings:*",
      "last_notif:*",
      "processed:*",
      "rumor_comment:*",
      "blacklist",
      "restrictions_enabled",
      "karma_requirement",
      "account_age_requirement",
      "removal_reasons",
      "last_auto_approval",
    ];
    
    let deletedCount = 0;
    
    // Try to delete keys by pattern
    for (const pattern of keyPatterns) {
      try {
        // For wildcard patterns, we need to manually check common user patterns
        if (pattern.includes("*")) {
          // We can't scan in Devvit Redis, so we'll just note this limitation
          console.log(`Note: Cannot auto-scan pattern ${pattern} - keys must be deleted manually if they exist`);
        } else {
          // Delete specific keys
          await context.redis.del(pattern);
          deletedCount++;
          console.log(`Deleted key: ${pattern}`);
        }
      } catch (error) {
        console.log(`Could not delete ${pattern}:`, error);
      }
    }
    
    console.log(`Memory clear operation completed. Deleted ${deletedCount} keys`);
    
    return {
      success: true,
      keysDeleted: deletedCount,
      message: `Cleared bot memory. Deleted ${deletedCount} configuration keys. Note: User-specific keys (warnings, notifications) must be cleared individually per user.`,
    };
  } catch (error) {
    console.error("Error clearing memory:", error);
    return {
      success: false,
      keysDeleted: 0,
      message: `Failed to clear memory: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Clear memory for a specific user
 */
export async function clearUserMemory(
  context: Devvit.Context,
  username: string
): Promise<{
  success: boolean;
  keysDeleted: number;
  message: string;
}> {
  try {
    console.log(`Clearing memory for user: ${username}`);
    
    const keysToDelete = [
      `warnings:${username}`,
      `last_notif:${username}`,
    ];
    
    let deletedCount = 0;
    for (const key of keysToDelete) {
      await context.redis.del(key);
      deletedCount++;
    }
    
    console.log(`Deleted ${deletedCount} keys for user ${username}`);
    
    return {
      success: true,
      keysDeleted: deletedCount,
      message: `Cleared memory for u/${username}. Deleted ${deletedCount} keys.`,
    };
  } catch (error) {
    console.error(`Error clearing memory for user ${username}:`, error);
    return {
      success: false,
      keysDeleted: 0,
      message: `Failed to clear user memory: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
