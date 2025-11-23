# BP ModShield Bot - Feature Documentation

A comprehensive moderation bot for r/BLACKPINKSNARK built with the Devvit framework.

## Features

### 1. Word Blacklist Filtering ✅

**What it does:**
- Automatically scans all new posts and comments for blacklisted words
- Removes content containing any blacklisted terms
- Replies to the removed content with an informative message

**Current blacklist (for testing):**
- `test1`
- `test2`

**To update the blacklist later:** Store your custom list in Redis using the key `blacklist` as a JSON array.

**Removal message format:**
```
Greetings [author]!

Thank you for posting to r/BLACKPINKSNARK.

Your content was removed automatically by our bot. This usually means you tried saying something offensive, derogatory, rude or racist. Try re-phrasing it and posting it again.

---

You have **[X]** removal(s) active and **[Y]** past removal(s) that are no longer counted.

---

*This action was performed automatically by a bot, not a human.*
*If you feel this was in error, or need more clarification, please don't hesitate to modmail us. Thank you!*
```

**Files:** `src/blacklist.ts`, `src/config.ts`

---

### 2. Automatic Reddit Spam Restoration ✅

**What it does:**
- Monitors content filtered by Reddit's spam system
- Automatically approves Reddit-filtered content (not human moderator removals)
- Notifies users once every 5 days about restored content

**Restoration message:**
Explains why content was filtered and that it's been automatically approved, with links to shadow ban checks and Reddit support.

**Files:** `src/restoration.ts`, `src/warnings.ts`

---

### 3. Custom Mod Removal Reasons ✅

**What it does:**
- Adds "Remove with reason" option in mod menu for posts and comments
- Moderators can select from predefined removal reasons
- Bot removes content, replies with reason, stickies and locks the reply
- Adds mod note to user's profile
- Optional: Add warning to user (counts toward automatic bans)

**Default removal reasons:**
1. Spam
2. Harassment
3. Off-topic

**To add custom reasons:** Update the `DEFAULT_REMOVAL_REASONS` array in `src/removal.ts` or store in Redis.

**Manual removal message format:**
```
Greetings [author]!

[Reason-specific text goes here]

---

You have **[X]** removal(s) active and **[Y]** past removal(s) that are no longer counted.

---

*This action was performed by a bot at the explicit direction of a human. This was not an automated action, but a conscious decision by a sapient life form charged with moderating this sub.*
*If you feel this was in error, or need more clarification, please don't hesitate to modmail us. Thank you!*
```

**Files:** `src/removal.ts`

---

### 4. Warning System with Automatic Bans ✅

**What it does:**
- Tracks warnings issued through bot's removal system
- Automatically escalates to bans at specific thresholds
- Detects when content is reinstated and revokes warning
- Warnings expire after 90 days

**Ban thresholds:**
- **6 warnings** = 7 day ban
- **12 warnings** = 28 day ban  
- **26 warnings** = Permanent ban

**Warning tracking:**
- Each bot removal (when "add warning" is checked) = 1 warning
- Each blacklist violation automatically adds 1 warning
- If moderator reinstates content, warning is automatically removed
- Warnings older than 90 days are automatically cleaned up
- Users see their active and expired warning counts in removal messages
- Moderators see updated warning counts in toast notifications after removals

**Files:** `src/warnings.ts`, `src/removal.ts`

---

### 5. Participation Restrictions ✅

**What it does:**
- Configurable minimum karma and account age requirements
- Removes posts/comments from users who don't meet requirements
- Sends explanatory message to affected users

**Configuration:**
- **Default:** OFF (disabled by default)
- Minimum karma: Configurable (default: 0)
- Minimum account age: Configurable in days (default: 0)

**To enable/configure:** Use Redis keys:
- `restrictions_enabled` (set to "true" to enable)
- `karma_requirement` (set to number)
- `account_age_requirement` (set to number of days)

**Files:** `src/participation.ts`

---

### 6. Rumor Flair Detection ✅

**What it does:**
- Detects when a post has flair containing the word "rumor"
- Automatically adds a stickied and locked warning comment
- Works on post submission and when flair is changed

**Warning message:**
```
Greetings snarkers!

The post's content is classified as a rumor. Please take everything with a grain of salt and not too seriously, because these are unverified claims and make sure to remember our subreddit's rules when participating. Thank you!

---

*This action was performed automatically by a bot, not a human.*
*If you feel this was in error, or need more clarification, please don't hesitate to modmail us. Thank you!*
```

**Files:** `src/rumor.ts`

---

## File Structure

```
src/
├── main.ts           - Main entry point, event triggers, menu items
├── blacklist.ts      - Word blacklist filtering
├── restoration.ts    - Reddit spam restoration
├── removal.ts        - Custom removal reasons
├── warnings.ts       - Warning tracking and ban system
├── participation.ts  - Karma/age restrictions
├── rumor.ts          - Rumor flair detection
├── nuke.ts          - Comment mop functionality (existing)
└── config.ts         - Constants and configuration
```

## Setup & Deployment

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Login to Devvit:**
   ```bash
   npm run login
   ```

3. **Test locally:**
   ```bash
   npm run dev
   ```

4. **Deploy to Reddit:**
   ```bash
   npm run deploy
   ```

5. **Publish:**
   ```bash
   npm run launch
   ```

## Configuration

### Updating the Blacklist

Use Redis to store the blacklist:
```javascript
// Set blacklist
await context.redis.set('blacklist', JSON.stringify(['word1', 'word2', 'word3']));
```

### Enabling Participation Restrictions

```javascript
// Enable restrictions
await context.redis.set('restrictions_enabled', 'true');
await context.redis.set('karma_requirement', '100');
await context.redis.set('account_age_requirement', '30'); // 30 days
```

### Adding Custom Removal Reasons

Edit `src/removal.ts` and update the `DEFAULT_REMOVAL_REASONS` array:
```typescript
export const DEFAULT_REMOVAL_REASONS: RemovalReason[] = [
  {
    id: "your_id",
    label: "Display Label",
    reasonText: "The message users will see explaining the removal.",
  },
  // Add more reasons...
];
```

## How It Works

### Event Triggers

The bot uses several Devvit triggers:

- **PostSubmit**: Monitors new posts for blacklist words, participation requirements, and rumor flairs
- **CommentSubmit**: Monitors new comments for blacklist words and participation requirements  
- **PostUpdate**: Monitors flair changes to detect rumor flairs
- **ModAction**: Monitors moderator actions to detect content reinstatements and spam filtering

### Redis Storage

The bot uses Redis for persistent storage:
- User warnings and ban levels
- Last notification timestamps
- Blacklist configuration
- Participation requirements
- Processed items tracking (prevents duplicate actions)

### Mod Menu Integration

The bot adds custom menu items:
- "Mop comments" (existing feature)
- "Mop post comments" (existing feature)
- "Remove with reason" for posts
- "Remove with reason" for comments

## Testing

The bot includes `test1` and `test2` in the default blacklist for easy testing. Post or comment with these words to verify the blacklist feature works.

## Notes

- The bot requires `redditAPI`, `redis`, and `modLog` capabilities in Devvit
- All automatic actions are logged for transparency
- Warning system only applies to bot-initiated removals (not manual mod actions)
- Restoration system is designed to handle Reddit's spam filter, not mod removals
- The bot uses sticky/locked comments to prevent user replies to bot messages

## Future Enhancements

- Web interface for configuration
- Statistics dashboard
- Export warning/ban reports
- More granular removal reason templates
- Scheduled tasks for proactive spam checks
