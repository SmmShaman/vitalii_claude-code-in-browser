import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  replyToFacebookComment,
  replyToInstagramComment
} from '../_shared/facebook-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface PostReplyRequest {
  commentId: string
  replyText: string
  aiGeneratedText?: string
  wasEdited?: boolean
}

/**
 * Post Reply to Social Media Comment
 *
 * Sends a reply to a comment on Facebook, Instagram, or LinkedIn
 * and tracks the reply in the database.
 *
 * Version: 2025-01-17-v1
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { commentId, replyText, aiGeneratedText, wasEdited }: PostReplyRequest = await req.json()

    if (!commentId || !replyText) {
      throw new Error('commentId and replyText are required')
    }

    console.log('💬 Posting reply to comment:', commentId)
    console.log('   Reply text:', replyText.substring(0, 50) + '...')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch comment with platform info
    const { data: comment, error: commentError } = await supabase
      .from('social_media_comments')
      .select(`
        *,
        social_post:social_post_id (
          platform,
          platform_post_id
        )
      `)
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      throw new Error(`Comment not found: ${commentId}`)
    }

    const platform = comment.social_post.platform
    const platformCommentId = comment.platform_comment_id

    // Create reply record first
    const { data: replyRecord, error: insertError } = await supabase
      .from('comment_replies')
      .insert({
        comment_id: commentId,
        reply_text: replyText,
        ai_generated_text: aiGeneratedText,
        was_edited: wasEdited || false,
        platform: platform,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create reply record: ${insertError.message}`)
    }

    // Post reply to the platform
    let result: { success: boolean; replyId?: string; error?: string }

    switch (platform) {
      case 'facebook':
        result = await replyToFacebookComment(platformCommentId, replyText)
        break

      case 'instagram':
        result = await replyToInstagramComment(platformCommentId, replyText)
        break

      case 'linkedin':
        // LinkedIn commenting requires special API access
        result = {
          success: false,
          error: 'LinkedIn commenting requires Marketing Developer Platform approval'
        }
        break

      default:
        result = {
          success: false,
          error: `Unsupported platform: ${platform}`
        }
    }

    // Update reply record with result
    if (result.success) {
      await supabase
        .from('comment_replies')
        .update({
          platform_reply_id: result.replyId,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', replyRecord.id)

      // Mark comment as replied
      await supabase
        .from('social_media_comments')
        .update({ is_replied: true })
        .eq('id', commentId)

      console.log('✅ Reply posted successfully:', result.replyId)

      return new Response(
        JSON.stringify({
          success: true,
          replyId: result.replyId,
          message: `Reply posted to ${platform}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      // Update reply record with failure
      await supabase
        .from('comment_replies')
        .update({
          status: 'failed',
          error_message: result.error
        })
        .eq('id', replyRecord.id)

      console.error('❌ Failed to post reply:', result.error)

      return new Response(
        JSON.stringify({
          success: false,
          error: result.error
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error: any) {
    console.error('❌ Error posting reply:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
