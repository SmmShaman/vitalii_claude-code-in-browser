'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Filter,
  ChevronDown,
  Send,
  Edit3,
  Eye,
  EyeOff,
  Ban,
  Sparkles,
  User,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Linkedin,
  Instagram,
  Clock
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client'
import type { SocialMediaComment, CommentSentiment, SocialPlatform } from '@/integrations/supabase/types'

// Facebook icon component
const Facebook = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

interface CommentWithPost extends SocialMediaComment {
  social_media_posts?: {
    id: string
    content_type: string | null
    content_id: string | null
    platform_post_url: string | null
  } | null
}

const PLATFORMS: { id: SocialPlatform | 'all'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All', icon: MessageSquare },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
]

const SENTIMENTS: { id: CommentSentiment | 'all'; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'all', label: 'All', icon: MessageSquare, color: 'gray' },
  { id: 'positive', label: 'Positive', icon: ThumbsUp, color: 'green' },
  { id: 'negative', label: 'Negative', icon: ThumbsDown, color: 'red' },
  { id: 'neutral', label: 'Neutral', icon: HelpCircle, color: 'gray' },
  { id: 'question', label: 'Question', icon: HelpCircle, color: 'blue' },
  { id: 'spam', label: 'Spam', icon: AlertTriangle, color: 'yellow' },
]

const SENTIMENT_COLORS: Record<CommentSentiment, string> = {
  positive: 'bg-green-500/20 text-green-400',
  negative: 'bg-red-500/20 text-red-400',
  neutral: 'bg-gray-500/20 text-gray-400',
  question: 'bg-blue-500/20 text-blue-400',
  spam: 'bg-yellow-500/20 text-yellow-400',
}

export function SocialMediaCommentsManager() {
  const [comments, setComments] = useState<CommentWithPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all')
  const [sentimentFilter, setSentimentFilter] = useState<CommentSentiment | 'all'>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [tablesExist, setTablesExist] = useState(true)

  // Reply modal state
  const [replyingTo, setReplyingTo] = useState<CommentWithPost | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [replySuccess, setReplySuccess] = useState<string | null>(null)

  const loadComments = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setComments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // First check if the table exists
      const { error: tableError } = await supabase
        .from('social_media_comments')
        .select('id')
        .limit(1)

      if (tableError) {
        if (tableError.message.includes('does not exist') || tableError.code === '42P01') {
          setTablesExist(false)
          setComments([])
          setLoading(false)
          return
        }
        throw tableError
      }

      setTablesExist(true)

      // Build query
      let query = supabase
        .from('social_media_comments')
        .select(`
          *,
          social_media_posts:social_post_id(
            id,
            content_type,
            content_id,
            platform_post_url
          )
        `)
        .order('comment_created_at', { ascending: false })

      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter)
      }
      if (sentimentFilter !== 'all') {
        query = query.eq('sentiment', sentimentFilter)
      }
      if (showUnreadOnly) {
        query = query.eq('is_read', false)
      }

      const { data, error: fetchError } = await query.limit(100)

      if (fetchError) throw fetchError

      setComments(data || [])
    } catch (err) {
      console.error('Error loading comments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [platformFilter, sentimentFilter, showUnreadOnly])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const markAsRead = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('social_media_comments')
        .update({ is_read: true })
        .eq('id', commentId)

      if (error) throw error

      setComments(comments.map(c => c.id === commentId ? { ...c, is_read: true } : c))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const ignoreComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('social_media_comments')
        .update({ is_read: true, is_hidden: true })
        .eq('id', commentId)

      if (error) throw error

      setComments(comments.filter(c => c.id !== commentId))
    } catch (err) {
      console.error('Error ignoring comment:', err)
    }
  }

  const handleReply = async () => {
    if (!replyingTo || !replyText.trim()) return

    try {
      setSendingReply(true)
      setError(null)

      // Call the post-comment-reply edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/post-comment-reply`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commentId: replyingTo.id,
            replyText: replyText.trim(),
            wasEdited: isEditing,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reply')
      }

      // Update local state
      setComments(comments.map(c =>
        c.id === replyingTo.id ? { ...c, is_replied: true, is_read: true } : c
      ))

      setReplySuccess(`Reply sent successfully to ${replyingTo.author_name || 'user'}!`)
      setReplyingTo(null)
      setReplyText('')
      setIsEditing(false)

      // Clear success message after 3 seconds
      setTimeout(() => setReplySuccess(null), 3000)
    } catch (err) {
      console.error('Error sending reply:', err)
      setError(err instanceof Error ? err.message : 'Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  const openReplyModal = (comment: CommentWithPost, useAiSuggestion: boolean = true) => {
    setReplyingTo(comment)
    setReplyText(useAiSuggestion && comment.suggested_reply ? comment.suggested_reply : '')
    setIsEditing(!useAiSuggestion)
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin': return Linkedin
      case 'facebook': return Facebook
      case 'instagram': return Instagram
      default: return MessageSquare
    }
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Statistics
  const stats = {
    total: comments.length,
    unread: comments.filter(c => !c.is_read).length,
    positive: comments.filter(c => c.sentiment === 'positive').length,
    negative: comments.filter(c => c.sentiment === 'negative').length,
    questions: comments.filter(c => c.sentiment === 'question').length,
    replied: comments.filter(c => c.is_replied).length,
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-yellow-400" />
          <p className="text-yellow-200">Supabase is not configured. Please set up environment variables.</p>
        </div>
      </div>
    )
  }

  if (!tablesExist) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-cyan-600/20 to-blue-800/20 backdrop-blur-lg rounded-xl p-6 border border-cyan-500/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/30 rounded-lg">
              <MessageSquare className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Social Media Comments</h2>
              <p className="text-gray-300">Manage and reply to comments across platforms</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-200 mb-2">Database Tables Not Found</h3>
              <p className="text-yellow-200/80 mb-4">
                The social_media_comments table does not exist. Please apply the migrations in Supabase Dashboard.
              </p>
              <div className="bg-black/20 rounded-lg p-4 font-mono text-sm text-gray-300">
                <p className="mb-2">Run this SQL in Supabase SQL Editor:</p>
                <code className="text-green-400">
                  SELECT table_name FROM information_schema.tables<br/>
                  WHERE table_schema = &apos;public&apos;<br/>
                  AND table_name = &apos;social_media_comments&apos;;
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-600/20 to-blue-800/20 backdrop-blur-lg rounded-xl p-6 border border-cyan-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/30 rounded-lg">
              <MessageSquare className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Social Media Comments</h2>
              <p className="text-gray-300">Manage and reply to comments across platforms</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadComments}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 space-y-4">
              {/* Platform Filter */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => {
                    const Icon = platform.icon
                    return (
                      <motion.button
                        key={platform.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPlatformFilter(platform.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          platformFilter === platform.id
                            ? 'bg-cyan-600 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {platform.label}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Sentiment Filter */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Sentiment</label>
                <div className="flex flex-wrap gap-2">
                  {SENTIMENTS.map((sentiment) => {
                    const Icon = sentiment.icon
                    return (
                      <motion.button
                        key={sentiment.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSentimentFilter(sentiment.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          sentimentFilter === sentiment.id
                            ? 'bg-cyan-600 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {sentiment.label}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Unread Only Toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    showUnreadOnly
                      ? 'bg-cyan-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {showUnreadOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Unread Only
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {replySuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <p className="text-green-200">{replySuccess}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            <span className="text-gray-400 text-sm">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-yellow-400" />
            <span className="text-gray-400 text-sm">Unread</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.unread}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp className="h-4 w-4 text-green-400" />
            <span className="text-gray-400 text-sm">Positive</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.positive}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsDown className="h-4 w-4 text-red-400" />
            <span className="text-gray-400 text-sm">Negative</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.negative}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="h-4 w-4 text-blue-400" />
            <span className="text-gray-400 text-sm">Questions</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.questions}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-4 w-4 text-purple-400" />
            <span className="text-gray-400 text-sm">Replied</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{stats.replied}</p>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
          </div>
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 text-center">
          <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No comments yet</h3>
          <p className="text-gray-400">
            Comments will appear here after sync-comments workflow runs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {comments.map((comment, index) => {
              const PlatformIcon = getPlatformIcon(comment.platform)

              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className={`bg-white/10 backdrop-blur-lg rounded-xl border transition-colors ${
                    comment.is_read ? 'border-white/10' : 'border-cyan-500/50 bg-cyan-500/5'
                  }`}
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {comment.author_avatar_url ? (
                          <img
                            src={comment.author_avatar_url}
                            alt={comment.author_name || 'User'}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {comment.author_name || 'Unknown User'}
                            </span>
                            {comment.author_username && (
                              <span className="text-gray-400 text-sm">
                                @{comment.author_username}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <PlatformIcon className="h-3 w-3" />
                            <span>{formatDate(comment.comment_created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {comment.sentiment && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${SENTIMENT_COLORS[comment.sentiment]}`}>
                            {comment.sentiment}
                          </span>
                        )}
                        {!comment.is_read && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400">
                            NEW
                          </span>
                        )}
                        {comment.is_replied && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                            REPLIED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comment Text */}
                    <p className="text-gray-200 mb-4">{comment.comment_text}</p>

                    {/* AI Summary */}
                    {comment.ai_summary && (
                      <div className="bg-purple-500/10 rounded-lg p-3 mb-4 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-4 w-4 text-purple-400" />
                          <span className="text-sm font-medium text-purple-300">AI Summary</span>
                        </div>
                        <p className="text-sm text-gray-300">{comment.ai_summary}</p>
                      </div>
                    )}

                    {/* Suggested Reply */}
                    {comment.suggested_reply && !comment.is_replied && (
                      <div className="bg-green-500/10 rounded-lg p-3 mb-4 border border-green-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-medium text-green-300">Suggested Reply</span>
                          {comment.suggested_reply_generated_at && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(comment.suggested_reply_generated_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300">{comment.suggested_reply}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {!comment.is_replied && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openReplyModal(comment, true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                          >
                            <Send className="h-4 w-4" />
                            Reply with AI
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openReplyModal(comment, false)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                            Custom Reply
                          </motion.button>
                        </>
                      )}
                      {!comment.is_read && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => markAsRead(comment.id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          Mark Read
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => ignoreComment(comment.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-400 rounded-lg text-sm transition-colors"
                      >
                        <Ban className="h-4 w-4" />
                        Ignore
                      </motion.button>
                      {comment.social_media_posts?.platform_post_url && (
                        <a
                          href={comment.social_media_posts.platform_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-400 rounded-lg text-sm transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View Post
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Reply Modal */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setReplyingTo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-xl border border-white/20 p-6 max-w-lg w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Reply to {replyingTo.author_name || 'User'}
                </h3>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-300">&ldquo;{replyingTo.comment_text}&rdquo;</p>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">
                  Your Reply {isEditing && '(Custom)'}
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value)
                    setIsEditing(true)
                  }}
                  rows={4}
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Type your reply..."
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setReplyingTo(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {sendingReply ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Reply
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
