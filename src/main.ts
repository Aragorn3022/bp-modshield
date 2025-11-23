import { Devvit, type FormField } from "@devvit/public-api";

import { handleNuke, handleNukePost } from "./nuke.js";
import { checkBlacklistPost, checkBlacklistComment } from "./blacklist.js";
import { checkAndRestorePost, checkAndRestoreComment } from "./restoration.js";
import {
  handleCustomRemovalPost,
  handleCustomRemovalComment,
  getRemovalReasons,
  DEFAULT_REMOVAL_REASONS,
  type RemovalReason,
} from "./removal.js";
import {
  checkParticipationRequirements,
  handleInsufficientPost,
  handleInsufficientComment,
} from "./participation.js";
import { checkRumorFlair } from "./rumor.js";
import { removeWarning } from "./warnings.js";
import { clearAllMemory, clearUserMemory } from "./memory.js";

Devvit.configure({
  redditAPI: true,
  redis: true,
});

const nukeFields: FormField[] = [
  {
    name: "remove",
    label: "Remove comments",
    type: "boolean",
    defaultValue: true,
  },
  {
    name: "lock",
    label: "Lock comments",
    type: "boolean",
    defaultValue: false,
  },
  {
    name: "skipDistinguished",
    label: "Skip distinguished comments",
    type: "boolean",
    defaultValue: false,
  },
] as const;

const nukeForm = Devvit.createForm(
  () => {
    return {
      fields: nukeFields,
      title: "Mop Comments",
      acceptLabel: "Mop",
      cancelLabel: "Cancel",
    };
  },
  async ({ values }, context) => {
    if (!values.lock && !values.remove) {
      context.ui.showToast("You must select either lock or remove.");
      return;
    }

    if (context.commentId) {
      const result = await handleNuke(
        {
          remove: values.remove,
          lock: values.lock,
          skipDistinguished: values.skipDistinguished,
          commentId: context.commentId,
          subredditId: context.subredditId,
        },
        context
      );
      console.log(
        `Mop result - ${result.success ? "success" : "fail"} - ${
          result.message
        }`
      );
      context.ui.showToast(
        `${result.success ? "Success" : "Failed"} : ${result.message}`
      );
    } else {
      context.ui.showToast(`Mop failed! Please try again later.`);
    }
  }
);

// Form for mopping all comments on a post
const nukePostForm = Devvit.createForm(
  () => {
    return {
      fields: nukeFields,
      title: "Mop Post Comments",
      acceptLabel: "Mop",
      cancelLabel: "Cancel",
    };
  },
  async ({ values }, context) => {
    if (!values.lock && !values.remove) {
      context.ui.showToast("You must select either lock or remove.");
      return;
    }

    if (!context.postId) {
      throw new Error("No post ID");
    }

    const result = await handleNukePost(
      {
        remove: values.remove,
        lock: values.lock,
        skipDistinguished: values.skipDistinguished,
        postId: context.postId,
        subredditId: context.subredditId,
      },
      context
    );
    console.log(
      `Mop result - ${result.success ? "success" : "fail"} - ${result.message}`
    );
    context.ui.showToast(
      `${result.success ? "Success" : "Failed"} : ${result.message}`
    );
  }
);

Devvit.addMenuItem({
  label: "Mop comments",
  description:
    "Remove this comment and all child comments. This might take a few seconds to run.",
  location: "comment",
  forUserType: "moderator",
  onPress: (_, context) => {
    context.ui.showForm(nukeForm);
  },
});

Devvit.addMenuItem({
  label: "Remove with reason",
  description: "Remove this post with a custom removal reason",
  location: "post",
  forUserType: "moderator",
  onPress: (_, context) => {
    context.ui.showForm(postRemovalForm);
  },
});

Devvit.addMenuItem({
  label: "Mop post comments",
  description:
    "Remove all comments of this post. This might take a few seconds to run.",
  location: "post",
  forUserType: "moderator",
  onPress: (_, context) => {
    context.ui.showForm(nukePostForm);
  },
});

// Form for clearing all bot memory
const clearMemoryForm = Devvit.createForm(
  {
    fields: [
      {
        name: "confirm",
        label: "Type 'CONFIRM' to clear all bot memory",
        type: "string",
        required: true,
      },
    ],
    title: "Clear All Bot Memory",
    acceptLabel: "Clear Memory",
    cancelLabel: "Cancel",
  },
  async ({ values }, context) => {
    if (values.confirm !== "CONFIRM") {
      context.ui.showToast("❌ Operation cancelled - confirmation text did not match");
      return;
    }

    const result = await clearAllMemory(context);
    context.ui.showToast(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
  }
);

// Form for clearing user-specific memory
const clearUserMemoryForm = Devvit.createForm(
  {
    fields: [
      {
        name: "username",
        label: "Username (without u/)",
        type: "string",
        required: true,
      },
    ],
    title: "Clear User Memory",
    acceptLabel: "Clear",
    cancelLabel: "Cancel",
  },
  async ({ values }, context) => {
    if (!values.username) {
      context.ui.showToast("❌ Username is required");
      return;
    }

    const result = await clearUserMemory(context, values.username);
    context.ui.showToast(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
  }
);

// Menu items for memory management - accessible from any post
Devvit.addMenuItem({
  label: "🗑️ Clear all bot memory",
  description: "Delete all warnings, notifications, and bot data",
  location: "post",
  forUserType: "moderator",
  onPress: (_, context) => {
    context.ui.showForm(clearMemoryForm);
  },
});

Devvit.addMenuItem({
  label: "🗑️ Clear user memory",
  description: "Remove warnings and data for a specific user",
  location: "post",
  forUserType: "moderator",
  onPress: (_, context) => {
    context.ui.showForm(clearUserMemoryForm);
  },
});

// ============================================================================
// EVENT HANDLERS - Automatic monitoring and actions
// ============================================================================

// Monitor new posts
Devvit.addTrigger({
  event: "PostSubmit",
  async onEvent(event, context) {
    try {
      const post = await context.reddit.getPostById(event.post!.id);

      // Check participation requirements first
      if (post.authorName) {
        const participationCheck = await checkParticipationRequirements(
          context,
          post.authorName
        );
        if (!participationCheck.allowed && participationCheck.reason) {
          await handleInsufficientPost(post, context, participationCheck.reason);
          return;
        }
      }

      // Check for blacklisted words
      await checkBlacklistPost(post, context);

      // Check for rumor flair
      await checkRumorFlair(post, context);
    } catch (error) {
      console.error("Error in PostSubmit trigger:", error);
    }
  },
});

// Monitor new comments
Devvit.addTrigger({
  event: "CommentSubmit",
  async onEvent(event, context) {
    try {
      const comment = await context.reddit.getCommentById(event.comment!.id);

      // Check participation requirements first
      if (comment.authorName) {
        const participationCheck = await checkParticipationRequirements(
          context,
          comment.authorName
        );
        if (!participationCheck.allowed && participationCheck.reason) {
          await handleInsufficientComment(comment, context, participationCheck.reason);
          return;
        }
      }

      // Check for blacklisted words
      await checkBlacklistComment(comment, context);
    } catch (error) {
      console.error("Error in CommentSubmit trigger:", error);
    }
  },
});

// Monitor post updates (for flair changes)
Devvit.addTrigger({
  event: "PostUpdate",
  async onEvent(event, context) {
    try {
      const post = await context.reddit.getPostById(event.post!.id);
      await checkRumorFlair(post, context);
    } catch (error) {
      console.error("Error in PostUpdate trigger:", error);
    }
  },
});

// Monitor mod actions to detect content reinstatement and flair changes
Devvit.addTrigger({
  event: "ModAction",
  async onEvent(event, context) {
    try {
      // Check if a moderator changed a post's flair
      if (event.action === "editflair" && event.targetPost?.id) {
        try {
          const post = await context.reddit.getPostById(event.targetPost.id);
          await checkRumorFlair(post, context);
          console.log(`Checked rumor flair after mod flair edit on post ${event.targetPost.id}`);
        } catch (error) {
          console.error(`Error checking flair after mod action on post ${event.targetPost.id}:`, error);
        }
      }
      
      // Check if a moderator approved/restored content that had a warning
      if (event.action === "approvelink" || event.action === "approvecomment") {
        const targetId = event.targetPost?.id || event.targetComment?.id;
        
        // Get the actual content to find the author
        if (targetId) {
          try {
            if (event.targetPost?.id) {
              const post = await context.reddit.getPostById(event.targetPost.id);
              if (post.authorName) {
                await removeWarning(context, post.authorName, targetId);
                console.log(`Removed warning for u/${post.authorName} - content ${targetId} was reinstated`);
              }
            } else if (event.targetComment?.id) {
              const comment = await context.reddit.getCommentById(event.targetComment.id);
              if (comment.authorName) {
                await removeWarning(context, comment.authorName, targetId);
                console.log(`Removed warning for u/${comment.authorName} - content ${targetId} was reinstated`);
              }
            }
          } catch (error) {
            console.error("Error processing approval:", error);
          }
        }
      }

      // Check for spam-filtered content to restore
      if (event.action === "spam") {
        const post = event.targetPost?.id
          ? await context.reddit.getPostById(event.targetPost.id)
          : null;
        const comment = event.targetComment?.id
          ? await context.reddit.getCommentById(event.targetComment.id)
          : null;

        if (post) {
          await checkAndRestorePost(post, context);
        } else if (comment) {
          await checkAndRestoreComment(comment, context);
        }
      }
    } catch (error) {
      console.error("Error in ModAction trigger:", error);
    }
  },
});

// ============================================================================
// CUSTOM REMOVAL MENU ITEMS
// ============================================================================

// Create removal form for posts
const createPostRemovalForm = (reasons: RemovalReason[]) => {
  return Devvit.createForm(
    () => {
      return {
        fields: [
          {
            name: "reason",
            label: "Removal Reason",
            type: "select",
            options: reasons.map((r) => ({ label: r.label, value: r.id })),
            required: true,
          },
          {
            name: "addWarning",
            label: "Add warning to user (counts toward ban threshold)",
            type: "boolean",
            defaultValue: true,
          },
        ],
        title: "Remove Post",
        acceptLabel: "Remove",
        cancelLabel: "Cancel",
      };
    },
    async ({ values }, context) => {
      try {
        if (!context.postId) {
          context.ui.showToast("Error: No post ID found");
          return;
        }

        const post = await context.reddit.getPostById(context.postId);
        const currentUser = await context.reddit.getCurrentUser();

        if (!currentUser) {
          context.ui.showToast("Error: Could not identify moderator");
          return;
        }

        const selectedReason = reasons.find((r) => r.id === values.reason);
        if (!selectedReason) {
          context.ui.showToast("Error: Invalid removal reason");
          return;
        }

        await handleCustomRemovalPost(
          post,
          context,
          selectedReason,
          values.addWarning as boolean,
          currentUser.username
        );

        // Get updated warning counts to show moderator
        if (post.authorName) {
          const { getWarningCounts } = await import("./warnings.js");
          const counts = await getWarningCounts(context, post.authorName);
          context.ui.showToast(
            `Post removed: ${selectedReason.label}. User now has ${counts.active} active warning(s).`
          );
        } else {
          context.ui.showToast(`Post removed: ${selectedReason.label}`);
        }
      } catch (error) {
        console.error("Error in post removal form:", error);
        context.ui.showToast("Error: Failed to remove post");
      }
    }
  );
};

// Create removal form for comments
const createCommentRemovalForm = (reasons: RemovalReason[]) => {
  return Devvit.createForm(
    () => {
      return {
        fields: [
          {
            name: "reason",
            label: "Removal Reason",
            type: "select",
            options: reasons.map((r) => ({ label: r.label, value: r.id })),
            required: true,
          },
          {
            name: "addWarning",
            label: "Add warning to user (counts toward ban threshold)",
            type: "boolean",
            defaultValue: true,
          },
        ],
        title: "Remove Comment",
        acceptLabel: "Remove",
        cancelLabel: "Cancel",
      };
    },
    async ({ values }, context) => {
      try {
        if (!context.commentId) {
          context.ui.showToast("Error: No comment ID found");
          return;
        }

        const comment = await context.reddit.getCommentById(context.commentId);
        const currentUser = await context.reddit.getCurrentUser();

        if (!currentUser) {
          context.ui.showToast("Error: Could not identify moderator");
          return;
        }

        const selectedReason = reasons.find((r) => r.id === values.reason);
        if (!selectedReason) {
          context.ui.showToast("Error: Invalid removal reason");
          return;
        }

        await handleCustomRemovalComment(
          comment,
          context,
          selectedReason,
          values.addWarning as boolean,
          currentUser.username
        );

        // Get updated warning counts to show moderator
        if (comment.authorName) {
          const { getWarningCounts } = await import("./warnings.js");
          const counts = await getWarningCounts(context, comment.authorName);
          context.ui.showToast(
            `Comment removed: ${selectedReason.label}. User now has ${counts.active} active warning(s).`
          );
        } else {
          context.ui.showToast(`Comment removed: ${selectedReason.label}`);
        }
      } catch (error) {
        console.error("Error in comment removal form:", error);
        context.ui.showToast("Error: Failed to remove comment");
      }
    }
  );
};

// Add menu items for custom removals
const postRemovalForm = createPostRemovalForm(DEFAULT_REMOVAL_REASONS);
const commentRemovalForm = createCommentRemovalForm(DEFAULT_REMOVAL_REASONS);

// Devvit.addMenuItem({
//   label: "Remove with reason",
//   description: "Remove this post with a custom removal reason",
//   location: "post",
//   forUserType: "moderator",
//   onPress: (_, context) => {
//     context.ui.showForm(postRemovalForm);
//   },
// });

Devvit.addMenuItem({
  label: "Remove with reason",
  description: "Remove this comment with a custom removal reason",
  location: "comment",
  forUserType: "moderator",
  onPress: (_, context) => {
    context.ui.showForm(commentRemovalForm);
  },
});

export default Devvit;
