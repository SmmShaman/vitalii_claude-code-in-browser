import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  escapeHtml,
  answerCallbackQuery,
  editMessageText
} from '../_shared/social-media-helpers.ts'

/**
 * Comments Bot Webhook Handler
 *
 * Handles callbacks from the separate comments notification bot.
 * This bot receives notifications about new comments and allows
 * the user to reply, edit, or ignore comments.
 *
 * Version: 2025-01-17-v1
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_COMMENTS_BOT_TOKEN = Deno.env.get('TELEGRAM_COMMENTS_BOT_TOKEN')

serve(async (req) => {
  if (!TELEGRAM_COMMENTS_BOT_TOKEN) {
    console.error('❌ TELEGRAM_COMMENTS_BOT_TOKEN not configured')
    return new Response(JSON.stringify({ error: 'Bot not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const update = await req.json()
    console.log('Comments bot webhook received:', JSON.stringify(update, null, 2))

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // =================================================================
    // Handle Callback Queries (button presses)
    // =================================================================
    if (update.callback_query) {
      const callbackData = update.callback_query.data
      const callbackId = update.callback_query.id
      const messageId = update.callback_query.message.message_id
      const chatId = update.callback_query.message.chat.id
      const messageText = update.callback_query.message.text || ''

      console.log('Comments bot callback:', callbackData)

      // Parse callback data
      if (callbackData.startsWith('reply_comment_')) {
        // =================================================================
        // ✅ Reply to comment with AI-generated text
        // =================================================================
        const commentId = callbackData.replace('reply_comment_', '')
        console.log('Replying to comment:', commentId)

        // Fetch comment
        const { data: comment, error: fetchError } = await supabase
          .from('social_media_comments')
          .select('*, suggested_reply, social_post_id')
          .eq('id', commentId)
          .single()

        if (fetchError || !comment) {
          await answerCallbackQuery(callbackId, '❌ Comment not found', true, TELEGRAM_COMMENTS_BOT_TOKEN)
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        if (!comment.suggested_reply) {
          await answerCallbackQuery(callbackId, '❌ No reply suggestion available', true, TELEGRAM_COMMENTS_BOT_TOKEN)
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Call post-comment-reply function
        const replyResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/post-comment-reply`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              commentId: commentId,
              replyText: comment.suggested_reply,
              aiGeneratedText: comment.suggested_reply
            })
          }
        )

        const replyResult = await replyResponse.json()

        if (!replyResponse.ok || !replyResult.success) {
          await answerCallbackQuery(callbackId, `❌ Reply failed: ${replyResult.error}`, true, TELEGRAM_COMMENTS_BOT_TOKEN)
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Mark comment as replied
        await supabase
          .from('social_media_comments')
          .update({ is_replied: true })
          .eq('id', commentId)

        await answerCallbackQuery(callbackId, '✅ Reply sent!', false, TELEGRAM_COMMENTS_BOT_TOKEN)

        // Update message
        await editMessageText(
          chatId,
          messageId,
          messageText + '\n\n✅ <b>Reply sent successfully!</b>',
          { parseMode: 'HTML' },
          TELEGRAM_COMMENTS_BOT_TOKEN
        )

      } else if (callbackData.startsWith('edit_reply_')) {
        // =================================================================
        // ✏️ Edit reply before sending
        // =================================================================
        const commentId = callbackData.replace('edit_reply_', '')
        console.log('Editing reply for comment:', commentId)

        // Fetch comment
        const { data: comment } = await supabase
          .from('social_media_comments')
          .select('suggested_reply')
          .eq('id', commentId)
          .single()

        await answerCallbackQuery(callbackId, '✏️ Send your edited reply as a reply to this message', true, TELEGRAM_COMMENTS_BOT_TOKEN)

        // Update message to show we're waiting for edited reply
        await editMessageText(
          chatId,
          messageId,
          messageText + `\n\n✏️ <b>Editing reply...</b>\n<i>Reply to this message with your edited text</i>\n<code>editReply:${commentId}</code>`,
          { parseMode: 'HTML' },
          TELEGRAM_COMMENTS_BOT_TOKEN
        )

      } else if (callbackData.startsWith('ignore_comment_')) {
        // =================================================================
        // 🚫 Ignore comment (mark as read, don't reply)
        // =================================================================
        const commentId = callbackData.replace('ignore_comment_', '')
        console.log('Ignoring comment:', commentId)

        // Mark as read
        await supabase
          .from('social_media_comments')
          .update({ is_read: true })
          .eq('id', commentId)

        await answerCallbackQuery(callbackId, '✅ Comment ignored', false, TELEGRAM_COMMENTS_BOT_TOKEN)

        // Update message
        await editMessageText(
          chatId,
          messageId,
          messageText + '\n\n🚫 <b>Comment ignored</b>',
          { parseMode: 'HTML' },
          TELEGRAM_COMMENTS_BOT_TOKEN
        )

      } else if (callbackData.startsWith('engage_post_')) {
        // =================================================================
        // 💬 Engage with community post
        // =================================================================
        const postId = callbackData.replace('engage_post_', '')
        console.log('Engaging with community post:', postId)

        // Fetch post
        const { data: post } = await supabase
          .from('community_posts')
          .select('*, suggested_comment')
          .eq('id', postId)
          .single()

        if (!post || !post.suggested_comment) {
          await answerCallbackQuery(callbackId, '❌ Post or suggestion not found', true, TELEGRAM_COMMENTS_BOT_TOKEN)
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }

        await answerCallbackQuery(callbackId, '💬 Sending comment...', false, TELEGRAM_COMMENTS_BOT_TOKEN)

        // TODO: Implement actual commenting on LinkedIn/Facebook
        // For now, just mark as engaged and show the comment
        await supabase
          .from('community_posts')
          .update({
            is_engaged: true,
            engagement_type: 'comment'
          })
          .eq('id', postId)

        // Update message
        await editMessageText(
          chatId,
          messageId,
          messageText + `\n\n💬 <b>Comment posted!</b>\n<i>(Manual posting required for community posts)</i>`,
          { parseMode: 'HTML' },
          TELEGRAM_COMMENTS_BOT_TOKEN
        )

      } else if (callbackData.startsWith('skip_post_')) {
        // =================================================================
        // ⏭️ Skip community post
        // =================================================================
        const postId = callbackData.replace('skip_post_', '')
        console.log('Skipping community post:', postId)

        // Mark as read
        await supabase
          .from('community_posts')
          .update({ is_read: true })
          .eq('id', postId)

        await answerCallbackQuery(callbackId, '⏭️ Post skipped', false, TELEGRAM_COMMENTS_BOT_TOKEN)

        await editMessageText(
          chatId,
          messageId,
          messageText + '\n\n⏭️ <b>Skipped</b>',
          { parseMode: 'HTML' },
          TELEGRAM_COMMENTS_BOT_TOKEN
        )
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // =================================================================
    // Handle Messages (for edited replies)
    // =================================================================
    if (update.message) {
      const message = update.message
      const chatId = message.chat.id

      // Check if this is a reply to a message with editReply marker
      if (message.reply_to_message && message.text) {
        const replyToText = message.reply_to_message.text || ''
        const editMatch = replyToText.match(/editReply:([a-f0-9-]+)/)

        if (editMatch) {
          const commentId = editMatch[1]
          const editedReply = message.text

          console.log(`Received edited reply for comment ${commentId}:`, editedReply)

          // Get original AI suggestion
          const { data: comment } = await supabase
            .from('social_media_comments')
            .select('suggested_reply')
            .eq('id', commentId)
            .single()

          // Call post-comment-reply with edited text
          const replyResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/post-comment-reply`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                commentId: commentId,
                replyText: editedReply,
                aiGeneratedText: comment?.suggested_reply || null,
                wasEdited: true
              })
            }
          )

          const replyResult = await replyResponse.json()

          if (replyResult.success) {
            // Mark as replied
            await supabase
              .from('social_media_comments')
              .update({ is_replied: true })
              .eq('id', commentId)

            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_COMMENTS_BOT_TOKEN}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: '✅ Edited reply sent successfully!',
                  reply_to_message_id: message.message_id
                })
              }
            )

            // Update original message
            await editMessageText(
              chatId,
              message.reply_to_message.message_id,
              replyToText.replace(/\n\n✏️ <b>Editing reply\.\.\.<\/b>[\s\S]*$/, '') + '\n\n✅ <b>Edited reply sent!</b>',
              { parseMode: 'HTML' },
              TELEGRAM_COMMENTS_BOT_TOKEN
            )
          } else {
            await fetch(
              `https://api.telegram.org/bot${TELEGRAM_COMMENTS_BOT_TOKEN}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `❌ Failed to send reply: ${replyResult.error}`,
                  reply_to_message_id: message.message_id
                })
              }
            )
          }

          return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }

      // Handle /start command
      if (message.text === '/start') {
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_COMMENTS_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `👋 <b>Welcome to Comments Bot!</b>

This bot notifies you about:
• 📬 New comments on your social media posts
• 🔍 Relevant posts in monitored communities

<b>Commands:</b>
/start - Show this message
/status - Check sync status
/communities - List monitored communities

Notifications will appear here automatically.`,
              parse_mode: 'HTML'
            })
          }
        )

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Handle /status command
      if (message.text === '/status') {
        // Get comment stats
        const { count: unreadComments } = await supabase
          .from('social_media_comments')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)

        const { count: unrepliedComments } = await supabase
          .from('social_media_comments')
          .select('*', { count: 'exact', head: true })
          .eq('is_replied', false)
          .eq('is_read', true)

        const { count: unreadPosts } = await supabase
          .from('community_posts')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_COMMENTS_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `📊 <b>Status</b>

📬 Unread comments: ${unreadComments || 0}
💬 Unreplied comments: ${unrepliedComments || 0}
🔍 Unread community posts: ${unreadPosts || 0}

Last sync: Check logs for details`,
              parse_mode: 'HTML'
            })
          }
        )

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Handle /communities command
      if (message.text === '/communities') {
        const { data: communities } = await supabase
          .from('community_subscriptions')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (!communities || communities.length === 0) {
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_COMMENTS_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: '📋 No communities monitored yet.\n\nAdd communities via the admin panel.',
                parse_mode: 'HTML'
              })
            }
          )
        } else {
          const communityList = communities.map((c, i) =>
            `${i + 1}. <b>${escapeHtml(c.community_name)}</b>\n   Platform: ${c.platform}\n   Keywords: ${(c.keywords || []).join(', ')}`
          ).join('\n\n')

          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_COMMENTS_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `📋 <b>Monitored Communities</b>\n\n${communityList}`,
                parse_mode: 'HTML'
              })
            }
          )
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Comments bot webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
