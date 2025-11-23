# BP ModShield - Comprehensive Moderation Bot

A comprehensive moderation bot for r/BLACKPINKSNARK built with the Devvit framework.

## Features

1. **Word Blacklist Filtering** - Automatically removes posts/comments with blacklisted words
2. **Reddit Spam Restoration** - Auto-approves Reddit-filtered content with user notifications
3. **Custom Mod Removal Reasons** - Menu options for moderators with custom messages
4. **Warning System** - Automatic escalating bans (6/12/26 warnings)
5. **Participation Restrictions** - Configurable karma and account age minimums
6. **Rumor Flair Detection** - Auto-posts warnings on rumor-flaired posts

📖 **See [BOT_FEATURES.md](./BOT_FEATURES.md) for detailed feature documentation**  
📖 **See [MOD_GUIDE.md](./MOD_GUIDE.md) for moderator usage guide**

---

## Quick Start

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Login to Devvit:**
   ```bash
   npm run login
   ```

3. **Deploy to Reddit:**
   ```bash
   npm run deploy
   ```

4. **Install on your subreddit:**
   - Visit https://developers.reddit.com/apps/bp-modshield
   - Click "Install to Subreddit"
   - Select your subreddit

---

## Configuration Guide

### 1. Adding Words to the Blacklist

**Method 1: Edit the Default List (For Development)**

Edit `src/config.ts` and update the `DEFAULT_BLACKLIST` array:

```typescript
// Default blacklist - will add real terms later
export const DEFAULT_BLACKLIST = ["test1", "test2", "badword1", "badword2"];
```

Then redeploy:
```bash
npm run deploy
```

**Method 2: Using Redis (For Production - Recommended)**

This method allows you to update the blacklist without redeploying:

1. Install a Redis client or use Devvit's Redis browser
2. Set the key `blacklist` with a JSON array:
   ```json
   ["word1", "word2", "word3"]
   ```

The bot will use the Redis blacklist if it exists, otherwise it falls back to the default list in `config.ts`.

### 2. Configuring Participation Restrictions

By default, participation restrictions are **disabled**. To enable them:

**Set these Redis keys:**

```
restrictions_enabled = "true"
karma_requirement = "100"          (minimum karma)
account_age_requirement = "30"     (minimum days)
```

Users below these thresholds will have their content auto-removed with an explanation message.

### 3. Adding Custom Removal Reasons

Edit `src/removal.ts` and update the `DEFAULT_REMOVAL_REASONS` array:

```typescript
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
    id: "your_custom_reason",
    label: "Your Custom Label",
    reasonText: "Your custom explanation that users will see.",
  },
  // Add more reasons...
];
```

Then redeploy:
```bash
npm run deploy
```

### 4. Adjusting Ban Thresholds

Edit `src/config.ts` to change when automatic bans occur:

```typescript
export const WARNING_THRESHOLDS = {
  FIRST_BAN: 6,    // 7 day ban at 6 warnings
  SECOND_BAN: 12,  // 28 day ban at 12 warnings
  PERMA_BAN: 26,   // permanent ban at 26 warnings
} as const;

export const BAN_DURATIONS = {
  FIRST: 7,        // First ban duration (days)
  SECOND: 28,      // Second ban duration (days)
  PERMANENT: null, // Permanent ban
} as const;

export const WARNING_EXPIRY_DAYS = 90; // Warnings expire after 90 days
```

### 5. Changing Subreddit Name

Edit `src/config.ts`:

```typescript
export const SUBREDDIT_NAME = "BLACKPINKSNARK";
```

This updates all message templates automatically.

### 6. Customizing Messages

All bot messages are in `src/config.ts`:
- `BLACKLIST_REMOVAL_MESSAGE` - Sent when blacklisted word detected
- `RESTORATION_MESSAGE` - Sent when spam-filtered content is restored
- `MANUAL_REMOVAL_MESSAGE` - Sent when moderator removes with reason
- `RUMOR_FLAIR_MESSAGE` - Posted on rumor-flaired posts

Edit these functions to customize the messages, then redeploy.

---

## Development

### Commands

```bash
npm run dev      # Local playtest with hot reload
npm run deploy   # Deploy to Reddit
npm run launch   # Publish to production
```

### Testing

1. **Test blacklist:** Post/comment with "test1" or "test2"
2. **Test manual removal:** Use "Remove with reason" from mod menu
3. **Test rumor flair:** Create a post with a flair containing "rumor"
4. **Test warnings:** Remove content multiple times to see escalation

### File Structure

```
src/
├── main.ts           - Main entry, event triggers, menu items
├── blacklist.ts      - Word blacklist filtering
├── restoration.ts    - Reddit spam restoration
├── removal.ts        - Custom removal reasons
├── warnings.ts       - Warning tracking and ban system
├── participation.ts  - Karma/age restrictions
├── rumor.ts          - Rumor flair detection
├── nuke.ts           - Comment mop functionality
└── config.ts         - All configuration and messages
```

---

## Moderator Usage

### Available Menu Options

**On Posts:**
- "Remove with reason" - Remove post with custom reason + warning
- "Mop post comments" - Remove all comments on a post

**On Comments:**
- "Remove with reason" - Remove comment with custom reason + warning
- "Mop comments" - Remove comment and all replies

### Warning System

- Each "Remove with reason" (with warning checked) = 1 warning
- Blacklist violations automatically add 1 warning
- Users see their warning count in removal messages
- You see updated count in toast notifications
- If you reinstate content, the warning is automatically removed

### Automatic Features

These run automatically without moderator action:
- Blacklist filtering on new posts/comments
- Spam restoration (approves Reddit-filtered content)
- Rumor flair warnings (on posts with "rumor" in flair)
- Participation restrictions (if enabled)
- Automatic bans at warning thresholds

---

## Redis Keys Reference

| Key | Purpose | Example Value |
|-----|---------|---------------|
| `blacklist` | Word blacklist | `["word1", "word2"]` |
| `restrictions_enabled` | Enable participation restrictions | `"true"` or `"false"` |
| `karma_requirement` | Minimum karma | `"100"` |
| `account_age_requirement` | Minimum account age (days) | `"30"` |
| `warnings:{username}` | User warning record | Auto-managed |
| `last_notif:{username}` | Last notification timestamp | Auto-managed |
| `processed:{id}` | Processed content tracking | Auto-managed |
| `rumor_comment:{post_id}` | Rumor comment tracking | Auto-managed |

---

## Troubleshooting

### Blacklist not working
- Check that words are in lowercase in the blacklist
- Verify Redis connection (check Redis keys)
- Check console logs for errors

### Warnings not counting
- Only bot removals count toward warnings
- Manual mod removals (without bot) don't count
- Check Redis key: `warnings:{username}`

### Spam restoration not working
- Feature only restores Reddit's spam filter removals
- Won't restore moderator removals
- Check if content was actually spam-filtered vs manually removed

### Participation restrictions not working
- Check `restrictions_enabled` is set to `"true"`
- Verify karma and age requirement keys exist
- Check console logs for user info

---

## Documentation

- **[BOT_FEATURES.md](./BOT_FEATURES.md)** - Complete technical documentation
- **[MOD_GUIDE.md](./MOD_GUIDE.md)** - Guide for moderators
- **[WARNING_COUNTS_IMPLEMENTATION.md](./WARNING_COUNTS_IMPLEMENTATION.md)** - Warning count feature details

## Learn More

- [Devvit Documentation](https://developers.reddit.com/docs/)
- [Developer Portal](https://developers.reddit.com/my/apps)
- [Reddit API](https://www.reddit.com/dev/api)

## Support

For issues or questions:
1. Check the documentation files in this repo
2. Review console logs in Devvit dashboard
3. Check Reddit's mod actions log
4. Contact the developer
