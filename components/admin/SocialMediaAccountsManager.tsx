'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Key,
  Clock,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  Linkedin,
  Instagram,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client'
import type { SocialMediaAccount, SocialPlatform } from '@/integrations/supabase/types'

// Facebook icon component
const Facebook = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

// TikTok icon component
const TikTok = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)

interface PlatformConfig {
  id: SocialPlatform
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  instructions: {
    title: string
    steps: string[]
    links: { label: string; url: string }[]
  }
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    instructions: {
      title: 'LinkedIn OAuth Setup',
      steps: [
        'Go to LinkedIn Developer Portal',
        'Create a new app or select existing',
        'Add products: "Share on LinkedIn" and "Sign In with LinkedIn"',
        'Note your Client ID and Client Secret',
        'Get Access Token via OAuth 2.0 flow',
        'Add token to Supabase secrets as LINKEDIN_ACCESS_TOKEN',
        'Get your Person URN via GET /v2/me and add as LINKEDIN_PERSON_URN',
      ],
      links: [
        { label: 'LinkedIn Developer Portal', url: 'https://www.linkedin.com/developers/' },
        { label: 'OAuth Guide', url: 'https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow' },
      ],
    },
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-500',
    bgColor: 'bg-blue-600/20',
    instructions: {
      title: 'Facebook Page Setup',
      steps: [
        'Go to Facebook Business Settings',
        'Create a new App in Meta Developer Portal',
        'Add Facebook Login and Pages API products',
        'Generate a Page Access Token with pages_manage_posts permission',
        'Convert to long-lived token (60 days)',
        'Add token to Supabase secrets as FACEBOOK_PAGE_ACCESS_TOKEN',
        'Add your Page ID as FACEBOOK_PAGE_ID',
      ],
      links: [
        { label: 'Meta Developer Portal', url: 'https://developers.facebook.com/' },
        { label: 'Business Settings', url: 'https://business.facebook.com/settings' },
        { label: 'Access Token Debugger', url: 'https://developers.facebook.com/tools/accesstoken/' },
      ],
    },
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    instructions: {
      title: 'Instagram Business Setup',
      steps: [
        'Connect Instagram account to a Facebook Page (required)',
        'Convert to Instagram Professional/Business account',
        'Use the same FACEBOOK_PAGE_ACCESS_TOKEN (Instagram uses FB API)',
        'Get Instagram Business Account ID via Graph API',
        'Add to Supabase secrets as INSTAGRAM_ACCOUNT_ID',
        'Ensure instagram_basic and instagram_content_publish permissions',
      ],
      links: [
        { label: 'Instagram Graph API', url: 'https://developers.facebook.com/docs/instagram-api/' },
        { label: 'Content Publishing', url: 'https://developers.facebook.com/docs/instagram-api/guides/content-publishing' },
      ],
    },
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: TikTok,
    color: 'text-gray-300',
    bgColor: 'bg-gray-500/20',
    instructions: {
      title: 'TikTok (Manual Mode)',
      steps: [
        'TikTok API requires app review for auto-posting',
        'Current setup generates content for manual posting',
        'Copy generated caption and hashtags',
        'Download media file if included',
        'Post manually through TikTok app',
        'Optional: Apply for TikTok Content Posting API access',
      ],
      links: [
        { label: 'TikTok Developer Portal', url: 'https://developers.tiktok.com/' },
        { label: 'Content Posting API', url: 'https://developers.tiktok.com/doc/content-posting-api-get-started' },
      ],
    },
  },
]

type TokenStatus = 'active' | 'expiring' | 'expired' | 'unknown'

function getTokenStatus(expiresAt: string | null): { status: TokenStatus; daysLeft: number | null } {
  if (!expiresAt) return { status: 'unknown', daysLeft: null }

  const now = new Date()
  const expiry = new Date(expiresAt)
  const diffMs = expiry.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) return { status: 'expired', daysLeft: 0 }
  if (daysLeft <= 7) return { status: 'expiring', daysLeft }
  return { status: 'active', daysLeft }
}

const TOKEN_STATUS_STYLES: Record<TokenStatus, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle2 },
  expiring: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle },
  expired: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
  unknown: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Info },
}

export function SocialMediaAccountsManager() {
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPlatform, setExpandedPlatform] = useState<SocialPlatform | null>(null)
  const [tablesExist, setTablesExist] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadAccounts = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setAccounts([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // First check if the table exists
      const { error: tableError } = await supabase
        .from('social_media_accounts')
        .select('id')
        .limit(1)

      if (tableError) {
        if (tableError.message.includes('does not exist') || tableError.code === '42P01') {
          setTablesExist(false)
          setAccounts([])
          setLoading(false)
          return
        }
        throw tableError
      }

      setTablesExist(true)

      const { data, error: fetchError } = await supabase
        .from('social_media_accounts')
        .select('*')
        .order('platform', { ascending: true })

      if (fetchError) throw fetchError

      setAccounts(data || [])
    } catch (err) {
      console.error('Error loading accounts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const togglePlatform = (platform: SocialPlatform) => {
    setExpandedPlatform(expandedPlatform === platform ? null : platform)
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getAccountForPlatform = (platform: SocialPlatform): SocialMediaAccount | undefined => {
    return accounts.find(a => a.platform === platform)
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
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
        <div className="bg-gradient-to-br from-emerald-600/20 to-teal-800/20 backdrop-blur-lg rounded-xl p-6 border border-emerald-500/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/30 rounded-lg">
              <Users className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Social Media Accounts</h2>
              <p className="text-gray-300">Manage connected social media accounts</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-200 mb-2">Database Tables Not Found</h3>
              <p className="text-yellow-200/80 mb-4">
                The social_media_accounts table does not exist. Please apply the migrations in Supabase Dashboard.
              </p>
              <div className="bg-black/20 rounded-lg p-4 font-mono text-sm text-gray-300">
                <p className="mb-2">Run this SQL in Supabase SQL Editor:</p>
                <code className="text-green-400">
                  SELECT table_name FROM information_schema.tables<br/>
                  WHERE table_schema = &apos;public&apos;<br/>
                  AND table_name = &apos;social_media_accounts&apos;;
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
      <div className="bg-gradient-to-br from-emerald-600/20 to-teal-800/20 backdrop-blur-lg rounded-xl p-6 border border-emerald-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/30 rounded-lg">
              <Users className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Social Media Accounts</h2>
              <p className="text-gray-300">Manage connected social media accounts</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadAccounts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Platform Cards */}
      {loading ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {PLATFORM_CONFIGS.map((config) => {
            const account = getAccountForPlatform(config.id)
            const tokenInfo = account ? getTokenStatus(account.token_expires_at) : null
            const statusStyle = tokenInfo ? TOKEN_STATUS_STYLES[tokenInfo.status] : TOKEN_STATUS_STYLES.unknown
            const StatusIcon = statusStyle.icon
            const PlatformIcon = config.icon
            const isExpanded = expandedPlatform === config.id

            return (
              <motion.div
                key={config.id}
                layout
                className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden"
              >
                {/* Platform Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => togglePlatform(config.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${config.bgColor} rounded-lg`}>
                        <PlatformIcon className={`h-6 w-6 ${config.color}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{config.name}</h3>
                        {account ? (
                          <p className="text-sm text-gray-400">
                            {account.account_name || account.account_id || 'Connected'}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">Not connected</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {account && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusStyle.bg}`}>
                          <StatusIcon className={`h-4 w-4 ${statusStyle.text}`} />
                          <span className={`text-sm font-medium ${statusStyle.text}`}>
                            {tokenInfo?.status === 'active' && tokenInfo.daysLeft && `${tokenInfo.daysLeft}d left`}
                            {tokenInfo?.status === 'expiring' && tokenInfo.daysLeft && `${tokenInfo.daysLeft}d left`}
                            {tokenInfo?.status === 'expired' && 'Expired'}
                            {tokenInfo?.status === 'unknown' && 'No expiry set'}
                          </span>
                        </div>
                      )}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="border-t border-white/10 p-4 space-y-4">
                        {/* Account Details */}
                        {account && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Key className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-400">Account ID</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-white text-sm truncate">
                                  {account.account_id || '—'}
                                </code>
                                {account.account_id && (
                                  <button
                                    onClick={() => copyToClipboard(account.account_id!, `${config.id}-id`)}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                  >
                                    {copiedId === `${config.id}-id` ? (
                                      <Check className="h-4 w-4 text-green-400" />
                                    ) : (
                                      <Copy className="h-4 w-4 text-gray-400" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-400">Token Expires</span>
                              </div>
                              <p className="text-white text-sm">
                                {formatDate(account.token_expires_at)}
                              </p>
                            </div>

                            {account.permissions && (account.permissions as string[]).length > 0 && (
                              <div className="bg-white/5 rounded-lg p-3 md:col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <Shield className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-400">Permissions</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(account.permissions as string[]).map((perm, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300"
                                    >
                                      {perm}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Setup Instructions */}
                        <div className="bg-slate-800/50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-400" />
                            {config.instructions.title}
                          </h4>
                          <ol className="space-y-2 mb-4">
                            {config.instructions.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400">
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>

                          <div className="flex flex-wrap gap-2">
                            {config.instructions.links.map((link, i) => (
                              <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-gray-300 transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {link.label}
                              </a>
                            ))}
                          </div>
                        </div>

                        {/* Token Warning */}
                        {tokenInfo && (tokenInfo.status === 'expiring' || tokenInfo.status === 'expired') && (
                          <div className={`rounded-lg p-4 ${
                            tokenInfo.status === 'expired'
                              ? 'bg-red-500/10 border border-red-500/30'
                              : 'bg-yellow-500/10 border border-yellow-500/30'
                          }`}>
                            <div className="flex items-start gap-3">
                              <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                                tokenInfo.status === 'expired' ? 'text-red-400' : 'text-yellow-400'
                              }`} />
                              <div>
                                <h4 className={`font-medium ${
                                  tokenInfo.status === 'expired' ? 'text-red-300' : 'text-yellow-300'
                                }`}>
                                  {tokenInfo.status === 'expired'
                                    ? 'Token Has Expired'
                                    : `Token Expires in ${tokenInfo.daysLeft} Days`}
                                </h4>
                                <p className="text-sm text-gray-400 mt-1">
                                  {tokenInfo.status === 'expired'
                                    ? 'Please refresh your access token to continue posting.'
                                    : 'Consider refreshing your access token soon to avoid interruptions.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Environment Variables Info */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-purple-400" />
          Required Supabase Secrets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">LinkedIn</h4>
            <code className="block text-xs text-green-400 bg-black/30 rounded p-2">
              LINKEDIN_ACCESS_TOKEN<br/>
              LINKEDIN_PERSON_URN
            </code>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Facebook</h4>
            <code className="block text-xs text-green-400 bg-black/30 rounded p-2">
              FACEBOOK_PAGE_ACCESS_TOKEN<br/>
              FACEBOOK_PAGE_ID
            </code>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Instagram</h4>
            <code className="block text-xs text-green-400 bg-black/30 rounded p-2">
              FACEBOOK_PAGE_ACCESS_TOKEN (same)<br/>
              INSTAGRAM_ACCOUNT_ID
            </code>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Comments Bot</h4>
            <code className="block text-xs text-green-400 bg-black/30 rounded p-2">
              TELEGRAM_COMMENTS_BOT_TOKEN<br/>
              TELEGRAM_COMMENTS_CHAT_ID
            </code>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Set these in Supabase Dashboard → Settings → Edge Functions → Secrets
        </p>
      </div>
    </div>
  )
}
