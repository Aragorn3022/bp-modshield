# Warning Count Display - Implementation Summary

## Changes Made

Added functionality to display warning counts in all removal messages to provide transparency to users and moderators.

## What Users See

When content is removed (either automatically or by a moderator), users now see their warning status at the bottom of the removal message:

```
You have **[X]** removal(s) active and **[Y]** past removal(s) that are no longer counted.
```

### Examples:

**User with active warnings only:**
```
You have **3** removal(s) active.
```

**User with active and expired warnings:**
```
You have **2** removal(s) active and **5** past removal(s) that are no longer counted.
```

**First-time offender:**
```
You have **1** removal(s) active.
```

## What Moderators See

After removing content through the "Remove with reason" option, moderators receive a toast notification showing:
```
Post removed: [Reason]. User now has [X] active warning(s).
```

This helps moderators:
- Track repeat offenders
- Make informed moderation decisions
- Know when users are approaching ban thresholds

## Technical Implementation

### Files Modified:

1. **`src/config.ts`**
   - Updated `BLACKLIST_REMOVAL_MESSAGE` to accept warning counts
   - Updated `MANUAL_REMOVAL_MESSAGE` to accept warning counts
   - Both now display active and expired warning counts

2. **`src/warnings.ts`**
   - Added `getWarningCounts()` function
   - Returns active, expired, and total warning counts
   - Active = warnings from last 90 days
   - Expired = total warnings minus active warnings

3. **`src/blacklist.ts`**
   - Now adds warning before removal (so count includes current violation)
   - Retrieves warning counts
   - Passes counts to removal message

4. **`src/removal.ts`**
   - Imports `getWarningCounts`
   - Adds warning first (if selected)
   - Retrieves updated warning counts
   - Passes counts to removal message

5. **`src/main.ts`**
   - Updated toast notifications to show warning counts to moderators
   - Shows updated count after removal action

6. **Documentation**
   - Updated `BOT_FEATURES.md` with new message formats
   - Updated `MOD_GUIDE.md` with visibility details

## How It Works

### Order of Operations:

1. Content is flagged for removal
2. **Warning is added first** (if applicable)
3. Warning counts are retrieved (including the new warning)
4. Content is removed
5. Reply message is posted with warning counts
6. Moderator sees toast with updated count

### Warning Count Logic:

```typescript
{
  active: number,      // Warnings from last 90 days
  expired: number,     // Warnings older than 90 days
  total: number        // All-time warning count
}
```

### Message Display Logic:

- If `expired` > 0: Shows both active and expired counts
- If `expired` = 0: Shows only active count
- Format uses bold markdown (`**number**`) for emphasis

## Ban Threshold Reminder

Users approaching thresholds will see:
- 5 active warnings: One away from 7-day ban
- 11 active warnings: One away from 28-day ban
- 25 active warnings: One away from permanent ban

The warning count display helps users understand their standing and encourages better behavior.

## Benefits

### For Users:
✅ Transparency about their standing
✅ Clear indication of consequences
✅ Motivation to improve behavior
✅ Understanding that old violations expire

### For Moderators:
✅ Immediate feedback on user's warning status
✅ Better decision-making context
✅ No need to manually check Redis
✅ Quick identification of repeat offenders
✅ Confidence in ban system accuracy

## Testing

To test this feature:

1. **Test blacklist violation:**
   - Post/comment with "test1" or "test2"
   - Check the removal message for warning count

2. **Test manual removal:**
   - Use "Remove with reason" on content
   - Check the removal message for warning count
   - Verify toast shows updated count

3. **Test multiple removals:**
   - Remove content from same user multiple times
   - Verify count increments correctly
   - Check that expired warnings are tracked separately

4. **Test warning expiry:**
   - Warnings older than 90 days should show in "past removals"
   - Active count should only include recent warnings
