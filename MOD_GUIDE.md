# ModShield Configuration Guide for Moderators

This guide explains how to configure and use the ModShield bot for r/BLACKPINKSNARK.

## Quick Start

Once the bot is installed on your subreddit, most features work automatically. Here's what you can do:

### Using Mod Menu Options

1. **Remove with reason** (Posts/Comments)
   - Click the three dots (•••) on any post or comment
   - Select "Remove with reason"
   - Choose the removal reason from the dropdown
   - Check/uncheck "Add warning to user" 
   - Click "Remove"

2. **Mop comments** (Comments)
   - Click on a comment that starts a problematic thread
   - Select "Mop comments" from the menu
   - Choose options (remove, lock, skip distinguished)
   - Click "Mop"

3. **Mop post comments** (Posts)
   - Click on a post
   - Select "Mop post comments"
   - Choose options
   - Click "Mop"

## Configuration

### 1. Word Blacklist

**Current test words:** `test1`, `test2`

**To update the blacklist:**
You'll need to use Reddit's admin interface or ask a developer to run:
```
Set Redis key: blacklist
Value: ["word1", "word2", "word3"]
```

**What happens:**
- Content with blacklisted words is automatically removed
- User receives explanation message
- Action is logged in mod log

### 2. Participation Restrictions

**Default:** Disabled

**To enable:**
Contact your developer to set these Redis values:
```
restrictions_enabled: "true"
karma_requirement: "100" (example)
account_age_requirement: "30" (days, example)
```

**What happens:**
- Users below thresholds have their content auto-removed
- They receive explanation of requirements
- Action is logged in mod log

### 3. Removal Reasons

**Current removal reasons:**
1. Spam
2. Harassment  
3. Off-topic

**To add custom reasons:**
Ask your developer to edit `src/removal.ts` with your custom reasons and messages.

### 4. Warning System

**How it works:**
- Each removal (with "add warning" checked) = 1 warning
- Blacklist violations automatically add 1 warning
- 6 warnings = 7 day ban (automatic)
- 12 warnings = 28 day ban (automatic)
- 26 warnings = permanent ban (automatic)

**User visibility:**
- Users see their warning count at the bottom of all removal messages
- Shows both active warnings (counting toward bans) and expired warnings (no longer counted)
- Example: "You have **3** removal(s) active and **2** past removal(s) that are no longer counted."

**Moderator visibility:**
- After removing content, you'll see a toast notification showing the user's updated warning count
- Example: "Post removed: Spam. User now has 4 active warning(s)."

**Important notes:**
- Warnings expire after 90 days
- If you reinstate content (approve it), the warning is automatically removed
- Warnings ONLY apply to bot removals, not manual mod actions
- You can choose to skip adding a warning when removing content

**To view warnings:**
Currently requires developer access to Redis. Future updates will add a mod dashboard.

### 5. Reddit Spam Restoration

**Automatic feature:**
- Bot monitors Reddit's spam filter
- Automatically approves false positives
- Notifies users (once every 5 days max)
- Logs all restorations

**What you need to do:**
Nothing! This runs automatically.

**If you remove something:**
The bot won't restore content YOU removed, only Reddit's automated spam filter.

### 6. Rumor Flair

**Automatic feature:**
- When a post has a flair containing "rumor"
- Bot adds stickied warning comment
- Comment is automatically locked

**What you need to do:**
Just set the flair! The bot handles the rest.

## Understanding Bot Messages

### Blacklist Removal
```
Greetings [username]!
Thank you for posting to r/BLACKPINKSNARK.
Your content was removed automatically by our bot...

---

You have **2** removal(s) active and **1** past removal(s) that are no longer counted.
```

### Spam Restoration
```
Greetings [username]!
Your comment/post was (not anymore!) filtered by Reddit...
**We have already automatically approved your comment/post.**
```

### Manual Removal (by you)
```
Greetings [username]!
[Your custom removal reason]

---

You have **3** removal(s) active.

---
*This action was performed by a bot at the explicit direction of a human...*
```

### Rumor Warning
```
Greetings snarkers!
The post's content is classified as a rumor...
```

## Best Practices

### When to Add Warnings
✅ **Add warning when:**
- User is clearly violating rules
- Content is harmful/rule-breaking
- You want to track repeat offenders

❌ **Skip warning when:**
- Honest mistake by good-faith user
- Content is borderline/debatable
- User is new and learning the rules
- Technical/accidental issue

### Warning Thresholds
- **0-5 warnings:** Active user, keep an eye on them
- **6 warnings:** User gets 7-day ban (automatic)
- **6-11 warnings:** Serious concern, watch carefully after ban
- **12 warnings:** User gets 28-day ban (automatic)
- **26 warnings:** Permanent ban (automatic)

### Reinstating Content
If you realize you made a mistake:
1. Approve the content normally
2. The bot will automatically remove the warning
3. User's warning count decreases

## Troubleshooting

### "Bot removed something it shouldn't have"
1. Approve the content (this removes the warning)
2. Check if a blacklisted word triggered removal
3. Consider adjusting the blacklist

### "User complaining about automatic removal"
1. Check if participation restrictions are enabled
2. Check if they used a blacklisted word
3. Review their karma/account age
4. Use "Remove with reason" to give specific feedback

### "Warning system seems wrong"
1. Check if content was reinstated (removes warning)
2. Verify warnings are from bot removals, not manual
3. Remember warnings expire after 90 days

### "Rumor flair not working"
1. Verify flair text contains "rumor" (case-insensitive)
2. Check if bot already commented (only comments once per post)
3. Try changing the flair to trigger the check

## Getting Help

1. Check the mod log - all bot actions are logged
2. Review this guide and BOT_FEATURES.md
3. Contact your developer
4. Report issues via modmail

## Advanced: Redis Data

If you have Redis access, here are the keys used:

| Key | Purpose |
|-----|---------|
| `blacklist` | Word blacklist (JSON array) |
| `warnings:{username}` | User warning record |
| `last_notif:{username}` | Last notification timestamp |
| `restrictions_enabled` | Enable/disable participation restrictions |
| `karma_requirement` | Minimum karma required |
| `account_age_requirement` | Minimum account age (days) |
| `removal_reasons` | Custom removal reasons |
| `processed:{id}` | Tracking for processed content |
| `rumor_comment:{post_id}` | Tracking for rumor comments |

## Version & Updates

Current version: 1.0.0

Check for updates regularly to get new features and bug fixes.
