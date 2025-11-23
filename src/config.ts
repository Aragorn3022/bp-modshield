import { Devvit } from "@devvit/public-api";

export const SUBREDDIT_NAME = "BLACKPINKSNARK";

// Default blacklist - will add real terms later
export const DEFAULT_BLACKLIST = ["test1", "test2"];

export const BLACKLIST_REMOVAL_MESSAGE = (author: string, activeWarnings: number, expiredWarnings: number) => `
Greetings u/${author}!

Thank you for posting to r/${SUBREDDIT_NAME}.

Your content was removed automatically by our bot. This usually means you tried saying something offensive, derogatory, rude or racist. Try re-phrasing it and posting it again.

---

You have **${activeWarnings}** removal(s) active${expiredWarnings > 0 ? ` and **${expiredWarnings}** past removal(s) that are no longer counted` : ''}.

---

*This action was performed automatically by a bot, not a human.*

*If you feel this was in error, or need more clarification, please don't hesitate to [modmail us](https://www.reddit.com/message/compose?to=r/${SUBREDDIT_NAME}). Thank you!*
`.trim();

export const RESTORATION_MESSAGE = (author: string, contentType: "comment" | "post") => `
Greetings u/${author}!

Your ${contentType} was (not anymore!) filtered by Reddit. This can happen for several different reasons, including but not limited to:

* Your account being new and not having many contributions on our subreddit yet 
* Certain words or phrases triggering Reddit's filters 
* A URL you posted being on a sitewide blacklist 
* A possible shadow ban (you can check that here: https://www.reddit.com/r/ShadowBan/wiki/detection/)

**We have already automatically approved your ${contentType}.** You do not need to contact us about this. We cannot provide any additional details about why Reddit filtered it, as these filters are controlled by Reddit, not by the moderators of r/${SUBREDDIT_NAME}. 

If you need assistance from Reddit Support (for example, about filters, account trust, or spam history), you can contact them here: https://support.reddithelp.com/hc/en-us/requests/new

If you believe your account may be shadow banned, you can appeal that directly here: https://reddit.com/appeal

You will only see this message to your filtered out content every 5 days.

---

*This action was performed automatically by a bot, not a human.*

*If you feel this was in error, or need more clarification, please don't hesitate to [modmail us](https://www.reddit.com/message/compose?to=r/${SUBREDDIT_NAME}). Thank you!*
`.trim();

export const MANUAL_REMOVAL_MESSAGE = (author: string, reasonText: string, activeWarnings: number, expiredWarnings: number) => `
Greetings u/${author}!

${reasonText}

---

You have **${activeWarnings}** removal(s) active${expiredWarnings > 0 ? ` and **${expiredWarnings}** past removal(s) that are no longer counted` : ''}.

---

*This action was performed by a bot at the explicit direction of a human. This was not an automated action, but a conscious decision by a sapient life form charged with moderating this sub.*

*If you feel this was in error, or need more clarification, please don't hesitate to [modmail us](https://www.reddit.com/r/${SUBREDDIT_NAME}/). Thank you!*
`.trim();

export const RUMOR_FLAIR_MESSAGE = `
Greetings snarkers!

The post's content is classified as a [rumor](https://en.wikipedia.org/wiki/Rumor). Please take everything with a grain of salt and not too seriously, because these are unverified claims and make sure to remember our [subreddit's rules](https://www.reddit.com/r/${SUBREDDIT_NAME}/about/rules) when participating. Thank you!

---

*This action was performed automatically by a bot, not a human.*

*If you feel this was in error, or need more clarification, please don't hesitate to [modmail us](https://www.reddit.com/message/compose?to=r/${SUBREDDIT_NAME}). Thank you!*
`.trim();

// Warning thresholds
export const WARNING_THRESHOLDS = {
  FIRST_BAN: 6,    // 7 day ban
  SECOND_BAN: 12,  // 28 day ban
  PERMA_BAN: 26,   // permanent ban
} as const;

export const BAN_DURATIONS = {
  FIRST: 7,
  SECOND: 28,
  PERMANENT: null, // null means permanent
} as const;

export const WARNING_EXPIRY_DAYS = 90;

// Redis keys
export const REDIS_KEYS = {
  BLACKLIST: "blacklist",
  USER_WARNINGS: (username: string) => `warnings:${username}`,
  USER_LAST_NOTIFICATION: (username: string) => `last_notif:${username}`,
  KARMA_REQUIREMENT: "karma_requirement",
  ACCOUNT_AGE_REQUIREMENT: "account_age_requirement",
  RESTRICTIONS_ENABLED: "restrictions_enabled",
  REMOVAL_REASONS: "removal_reasons",
  PROCESSED_ITEMS: (id: string) => `processed:${id}`, // Track already processed content
} as const;

// Helper to check if content contains blacklisted words
export function containsBlacklistedWord(text: string, blacklist: string[]): boolean {
  const lowerText = text.toLowerCase();
  return blacklist.some(word => lowerText.includes(word.toLowerCase()));
}
