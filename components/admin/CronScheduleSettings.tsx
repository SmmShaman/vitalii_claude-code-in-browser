'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Save, AlertCircle, CheckCircle, Info, RefreshCw, Shield, ShieldOff, Zap, ZapOff, Calendar, Video, VideoOff, Layers, ArrowRightLeft } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const CRON_PRESETS = [
  { value: '*/5 * * * *', label: 'Every 5 minutes', seconds: 300 },
  { value: '*/10 * * * *', label: 'Every 10 minutes', seconds: 600 },
  { value: '*/15 * * * *', label: 'Every 15 minutes', seconds: 900 },
  { value: '*/30 * * * *', label: 'Every 30 minutes', seconds: 1800 },
  { value: '0 * * * *', label: 'Every hour', seconds: 3600 },
  { value: '0 */2 * * *', label: 'Every 2 hours', seconds: 7200 },
  { value: '0 */6 * * *', label: 'Every 6 hours', seconds: 21600 },
  { value: '0 */12 * * *', label: 'Every 12 hours', seconds: 43200 },
]

export const CronScheduleSettings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)

  const [telegramScraperSchedule, setTelegramScraperSchedule] = useState('*/10 * * * *')
  const [fetchNewsSchedule, setFetchNewsSchedule] = useState('0 * * * *')

  // Stream Mode state
  const [streamMode, setStreamMode] = useState<'legacy' | 'streams'>('legacy')
  const [savedStreamMode, setSavedStreamMode] = useState<'legacy' | 'streams'>('legacy')
  const [streamModeLoading, setStreamModeLoading] = useState(false)
  const [rewriteLanguage, setRewriteLanguage] = useState('en')
  const [savedRewriteLanguage, setSavedRewriteLanguage] = useState('en')
  const [topN, setTopN] = useState(3)
  const [savedTopN, setSavedTopN] = useState(3)

  // Pre-moderation toggle state
  const [preModerationEnabled, setPreModerationEnabled] = useState(true)
  const [savedPreModerationValue, setSavedPreModerationValue] = useState(true)
  const [preModerationLoading, setPreModerationLoading] = useState(false)

  // Auto-publish toggle state
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false)
  const [savedAutoPublishValue, setSavedAutoPublishValue] = useState(false)
  const [autoPublishLoading, setAutoPublishLoading] = useState(false)
  const [autoPublishPlatforms, setAutoPublishPlatforms] = useState<string[]>(['linkedin', 'facebook', 'instagram'])
  const [savedAutoPublishPlatforms, setSavedAutoPublishPlatforms] = useState<string[]>(['linkedin', 'facebook', 'instagram'])
  const [autoPublishLanguages, setAutoPublishLanguages] = useState<string[]>(['en', 'no', 'ua'])
  const [savedAutoPublishLanguages, setSavedAutoPublishLanguages] = useState<string[]>(['en', 'no', 'ua'])

  // Video generation toggle state
  const [videoGenerationEnabled, setVideoGenerationEnabled] = useState(true)
  const [savedVideoGenerationValue, setSavedVideoGenerationValue] = useState(true)
  const [videoGenerationLoading, setVideoGenerationLoading] = useState(false)

  // Publishing schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(true)
  const [savedScheduleEnabled, setSavedScheduleEnabled] = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleWindows, setScheduleWindows] = useState([
    { id: 'morning', start: '08:00', end: '10:00', types: ['heavy', 'light'], label: 'Morning' },
    { id: 'afternoon', start: '17:00', end: '18:00', types: ['light'], label: 'Afternoon' },
    { id: 'evening', start: '20:00', end: '22:00', types: ['light'], label: 'Evening' },
  ])
  const [savedScheduleWindows, setSavedScheduleWindows] = useState(JSON.stringify(scheduleWindows))
  const [slotMinutes, setSlotMinutes] = useState(7)
  const [savedSlotMinutes, setSavedSlotMinutes] = useState(7)
  const [maxPerDay, setMaxPerDay] = useState(20)
  const [savedMaxPerDay, setSavedMaxPerDay] = useState(20)

  const hasUnsavedScheduleChanges = scheduleEnabled !== savedScheduleEnabled
    || JSON.stringify(scheduleWindows) !== savedScheduleWindows
    || slotMinutes !== savedSlotMinutes
    || maxPerDay !== savedMaxPerDay

  // Check if there are unsaved stream mode changes
  const hasUnsavedStreamModeChanges = streamMode !== savedStreamMode
    || rewriteLanguage !== savedRewriteLanguage
    || topN !== savedTopN

  // Check if there are unsaved pre-moderation changes
  const hasUnsavedPreModerationChanges = preModerationEnabled !== savedPreModerationValue

  // Check if there are unsaved video generation changes
  const hasUnsavedVideoGenerationChanges = videoGenerationEnabled !== savedVideoGenerationValue

  // Check if there are unsaved auto-publish changes
  const hasUnsavedAutoPublishChanges = autoPublishEnabled !== savedAutoPublishValue
    || JSON.stringify(autoPublishPlatforms.sort()) !== JSON.stringify(savedAutoPublishPlatforms.sort())
    || JSON.stringify(autoPublishLanguages.sort()) !== JSON.stringify(savedAutoPublishLanguages.sort())

  useEffect(() => {
    loadCronJobs()
  }, [])

  const loadCronJobs = async () => {
    try {
      setLoading(true)
      setTelegramScraperSchedule('*/10 * * * *')
      setFetchNewsSchedule('0 * * * *')

      // Load stream mode settings
      const { data: streamSettings } = await supabase
        .from('api_settings')
        .select('key_name, key_value')
        .in('key_name', ['STREAM_MODE', 'STREAM1_REWRITE_LANGUAGE', 'STREAM3_TOP_N'])

      if (streamSettings) {
        for (const s of streamSettings) {
          if (s.key_name === 'STREAM_MODE') {
            const mode = s.key_value === 'streams' ? 'streams' : 'legacy'
            setStreamMode(mode)
            setSavedStreamMode(mode)
          } else if (s.key_name === 'STREAM1_REWRITE_LANGUAGE') {
            setRewriteLanguage(s.key_value || 'en')
            setSavedRewriteLanguage(s.key_value || 'en')
          } else if (s.key_name === 'STREAM3_TOP_N') {
            const val = parseInt(s.key_value, 10)
            if (!isNaN(val)) { setTopN(val); setSavedTopN(val) }
          }
        }
      }

      // Load pre-moderation setting
      const { data: preModerationSetting, error } = await supabase
        .from('api_settings')
        .select('key_value')
        .eq('key_name', 'ENABLE_PRE_MODERATION')
        .single()

      if (!error && preModerationSetting) {
        const isEnabled = preModerationSetting.key_value !== 'false'
        setPreModerationEnabled(isEnabled)
        setSavedPreModerationValue(isEnabled)
      }

      // Load video generation setting
      const { data: videoGenSetting, error: videoGenError } = await supabase
        .from('api_settings')
        .select('key_value')
        .eq('key_name', 'ENABLE_VIDEO_GENERATION')
        .single()

      if (!videoGenError && videoGenSetting) {
        const isEnabled = videoGenSetting.key_value !== 'false'
        setVideoGenerationEnabled(isEnabled)
        setSavedVideoGenerationValue(isEnabled)
      }

      // Load schedule settings
      const { data: schedSettings } = await supabase
        .from('api_settings')
        .select('key_name, key_value')
        .in('key_name', ['PUBLISH_SCHEDULE_ENABLED', 'PUBLISH_SCHEDULE_WINDOWS', 'PUBLISH_SCHEDULE_SLOT_MINUTES', 'PUBLISH_SCHEDULE_MAX_PER_DAY'])

      if (schedSettings) {
        for (const s of schedSettings) {
          if (s.key_name === 'PUBLISH_SCHEDULE_ENABLED') {
            const en = s.key_value === 'true'
            setScheduleEnabled(en)
            setSavedScheduleEnabled(en)
          } else if (s.key_name === 'PUBLISH_SCHEDULE_WINDOWS') {
            try {
              const parsed = JSON.parse(s.key_value)
              if (parsed.windows) {
                setScheduleWindows(parsed.windows)
                setSavedScheduleWindows(JSON.stringify(parsed.windows))
              }
            } catch { /* keep defaults */ }
          } else if (s.key_name === 'PUBLISH_SCHEDULE_SLOT_MINUTES') {
            const val = parseInt(s.key_value, 10)
            if (!isNaN(val)) { setSlotMinutes(val); setSavedSlotMinutes(val) }
          } else if (s.key_name === 'PUBLISH_SCHEDULE_MAX_PER_DAY') {
            const val = parseInt(s.key_value, 10)
            if (!isNaN(val)) { setMaxPerDay(val); setSavedMaxPerDay(val) }
          }
        }
      }

      // Load auto-publish settings
      const { data: autoPublishSettings } = await supabase
        .from('api_settings')
        .select('key_name, key_value')
        .in('key_name', ['ENABLE_AUTO_PUBLISH', 'AUTO_PUBLISH_PLATFORMS', 'AUTO_PUBLISH_LANGUAGES'])

      if (autoPublishSettings) {
        for (const s of autoPublishSettings) {
          if (s.key_name === 'ENABLE_AUTO_PUBLISH') {
            const enabled = s.key_value === 'true'
            setAutoPublishEnabled(enabled)
            setSavedAutoPublishValue(enabled)
          } else if (s.key_name === 'AUTO_PUBLISH_PLATFORMS') {
            const platforms = s.key_value.split(',').map((p: string) => p.trim()).filter(Boolean)
            setAutoPublishPlatforms(platforms)
            setSavedAutoPublishPlatforms(platforms)
          } else if (s.key_name === 'AUTO_PUBLISH_LANGUAGES') {
            const langs = s.key_value.split(',').map((l: string) => l.trim()).filter(Boolean)
            setAutoPublishLanguages(langs)
            setSavedAutoPublishLanguages(langs)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load cron jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Save stream mode settings
  const saveStreamMode = async () => {
    try {
      setStreamModeLoading(true)
      setSaveResult(null)

      const settings = [
        { key_name: 'STREAM_MODE', key_value: streamMode, description: 'Pipeline mode: legacy (auto-publish all) or streams (3-stream pipeline)' },
        { key_name: 'STREAM1_REWRITE_LANGUAGE', key_value: rewriteLanguage, description: 'Rewrite language for website stream: en, no, smart' },
        { key_name: 'STREAM3_TOP_N', key_value: topN.toString(), description: 'Top N articles for social media daily' },
      ]

      for (const setting of settings) {
        const { data, error } = await supabase
          .from('api_settings')
          .update({ key_value: setting.key_value })
          .eq('key_name', setting.key_name)
          .select()

        if (error) throw error

        if (!data || data.length === 0) {
          const { error: insertError } = await supabase
            .from('api_settings')
            .insert({ ...setting, is_active: true })
            .select()

          if (insertError) throw insertError
        }
      }

      setSavedStreamMode(streamMode)
      setSavedRewriteLanguage(rewriteLanguage)
      setSavedTopN(topN)
      setSaveResult({
        success: true,
        message: streamMode === 'streams'
          ? `Streams mode active: Website (${rewriteLanguage.toUpperCase()}) + Video Digest + Top ${topN} Social`
          : 'Legacy mode: all articles auto-published with 3-language rewrite + AI images + social posting'
      })
    } catch (error: any) {
      console.error('Failed to save stream mode:', error)
      setSaveResult({
        success: false,
        message: `Failed to save stream mode: ${error.message || 'Unknown error'}`
      })
    } finally {
      setStreamModeLoading(false)
    }
  }

  // Toggle only changes local state, doesn't save
  const togglePreModeration = () => {
    setPreModerationEnabled(!preModerationEnabled)
    setSaveResult(null)
  }

  // Save pre-moderation setting to database
  const savePreModeration = async () => {
    try {
      setPreModerationLoading(true)
      setSaveResult(null)

      // Use .select() to verify the update actually happened
      const { data, error } = await supabase
        .from('api_settings')
        .update({ key_value: preModerationEnabled.toString() })
        .eq('key_name', 'ENABLE_PRE_MODERATION')
        .select()

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      // If no rows were updated (RLS blocked or setting doesn't exist), try insert
      if (!data || data.length === 0) {
        console.log('No rows updated, trying insert...')
        const { data: insertData, error: insertError } = await supabase
          .from('api_settings')
          .insert({
            key_name: 'ENABLE_PRE_MODERATION',
            key_value: preModerationEnabled.toString(),
            description: 'Global toggle for enabling/disabling AI pre-moderation of news',
            is_active: true
          })
          .select()

        if (insertError) {
          console.error('Insert error:', insertError)
          throw insertError
        }

        if (!insertData || insertData.length === 0) {
          throw new Error('Failed to insert setting - check RLS policies')
        }
      }

      console.log('Pre-moderation setting saved:', preModerationEnabled)
      setSavedPreModerationValue(preModerationEnabled)
      setSaveResult({
        success: true,
        message: preModerationEnabled
          ? 'AI Pre-moderation enabled. New posts will be filtered by AI.'
          : 'AI Pre-moderation disabled. All posts will be auto-approved.'
      })
    } catch (error: any) {
      console.error('Failed to save pre-moderation:', error)
      setSaveResult({
        success: false,
        message: `Failed to update pre-moderation setting: ${error.message || 'Unknown error'}. Please try again.`
      })
    } finally {
      setPreModerationLoading(false)
    }
  }

  // Toggle video generation (local state only)
  const toggleVideoGeneration = () => {
    setVideoGenerationEnabled(!videoGenerationEnabled)
    setSaveResult(null)
  }

  // Save video generation setting to database
  const saveVideoGeneration = async () => {
    try {
      setVideoGenerationLoading(true)
      setSaveResult(null)

      const { data, error } = await supabase
        .from('api_settings')
        .update({ key_value: videoGenerationEnabled.toString() })
        .eq('key_name', 'ENABLE_VIDEO_GENERATION')
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        const { error: insertError } = await supabase
          .from('api_settings')
          .insert({
            key_name: 'ENABLE_VIDEO_GENERATION',
            key_value: videoGenerationEnabled.toString(),
            description: 'Toggle Remotion video enhancement (AI voiceover + subtitles)',
            is_active: true
          })
          .select()

        if (insertError) throw insertError
      }

      setSavedVideoGenerationValue(videoGenerationEnabled)
      setSaveResult({
        success: true,
        message: videoGenerationEnabled
          ? 'Video generation enabled. Videos will be enhanced with AI voiceover and subtitles.'
          : 'Video generation disabled. Raw videos will be uploaded directly to YouTube.'
      })
    } catch (error: any) {
      console.error('Failed to save video generation:', error)
      setSaveResult({
        success: false,
        message: `Failed to update video generation setting: ${error.message || 'Unknown error'}`
      })
    } finally {
      setVideoGenerationLoading(false)
    }
  }

  // Toggle auto-publish (local state only)
  const toggleAutoPublish = () => {
    setAutoPublishEnabled(!autoPublishEnabled)
    setSaveResult(null)
  }

  // Toggle platform in auto-publish
  const togglePlatform = (platform: string) => {
    setAutoPublishPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    )
    setSaveResult(null)
  }

  // Toggle language in auto-publish
  const toggleLanguage = (lang: string) => {
    setAutoPublishLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
    setSaveResult(null)
  }

  // Save auto-publish settings to database
  const saveAutoPublish = async () => {
    try {
      setAutoPublishLoading(true)
      setSaveResult(null)

      const settings = [
        { key_name: 'ENABLE_AUTO_PUBLISH', key_value: autoPublishEnabled.toString(), description: 'Global toggle for fully automated news publishing' },
        { key_name: 'AUTO_PUBLISH_PLATFORMS', key_value: autoPublishPlatforms.join(','), description: 'Platforms for auto-publishing' },
        { key_name: 'AUTO_PUBLISH_LANGUAGES', key_value: autoPublishLanguages.join(','), description: 'Languages for auto-publishing' }
      ]

      for (const setting of settings) {
        const { data, error } = await supabase
          .from('api_settings')
          .update({ key_value: setting.key_value })
          .eq('key_name', setting.key_name)
          .select()

        if (error) throw error

        if (!data || data.length === 0) {
          const { error: insertError } = await supabase
            .from('api_settings')
            .insert({ ...setting, is_active: true })
            .select()

          if (insertError) throw insertError
        }
      }

      setSavedAutoPublishValue(autoPublishEnabled)
      setSavedAutoPublishPlatforms([...autoPublishPlatforms])
      setSavedAutoPublishLanguages([...autoPublishLanguages])
      setSaveResult({
        success: true,
        message: autoPublishEnabled
          ? `Auto-publish enabled: ${autoPublishPlatforms.join(', ')} × ${autoPublishLanguages.join(', ')}`
          : 'Auto-publish disabled. News will go through manual Telegram bot moderation.'
      })
    } catch (error: any) {
      console.error('Failed to save auto-publish:', error)
      setSaveResult({
        success: false,
        message: `Failed to update auto-publish setting: ${error.message || 'Unknown error'}`
      })
    } finally {
      setAutoPublishLoading(false)
    }
  }

  const saveScheduleSettings = async () => {
    try {
      setScheduleLoading(true)
      setSaveResult(null)

      const settings = [
        { key_name: 'PUBLISH_SCHEDULE_ENABLED', key_value: scheduleEnabled.toString(), description: 'Enable scheduled publishing queue' },
        { key_name: 'PUBLISH_SCHEDULE_WINDOWS', key_value: JSON.stringify({ windows: scheduleWindows }), description: 'Publishing windows config (Oslo time)' },
        { key_name: 'PUBLISH_SCHEDULE_SLOT_MINUTES', key_value: slotMinutes.toString(), description: 'Minutes between scheduled articles' },
        { key_name: 'PUBLISH_SCHEDULE_MAX_PER_DAY', key_value: maxPerDay.toString(), description: 'Max articles per day via scheduler' },
      ]

      for (const setting of settings) {
        const { data, error } = await supabase
          .from('api_settings')
          .update({ key_value: setting.key_value })
          .eq('key_name', setting.key_name)
          .select()

        if (error) throw error
        if (!data || data.length === 0) {
          const { error: insertError } = await supabase
            .from('api_settings')
            .insert({ ...setting, is_active: true })
            .select()
          if (insertError) throw insertError
        }
      }

      setSavedScheduleEnabled(scheduleEnabled)
      setSavedScheduleWindows(JSON.stringify(scheduleWindows))
      setSavedSlotMinutes(slotMinutes)
      setSavedMaxPerDay(maxPerDay)

      const totalSlots = scheduleWindows.reduce((acc, w) => {
        const [sh, sm] = w.start.split(':').map(Number)
        const [eh, em] = w.end.split(':').map(Number)
        const minutes = (eh * 60 + em) - (sh * 60 + sm)
        return acc + Math.floor(minutes / slotMinutes)
      }, 0)

      setSaveResult({
        success: true,
        message: scheduleEnabled
          ? `Schedule saved: ~${totalSlots} slots/day across ${scheduleWindows.length} windows, ${slotMinutes}min intervals`
          : 'Scheduled publishing disabled. Presets will fire immediately.'
      })
    } catch (error: any) {
      console.error('Failed to save schedule:', error)
      setSaveResult({ success: false, message: `Failed: ${error.message || 'Unknown error'}` })
    } finally {
      setScheduleLoading(false)
    }
  }

  const updateWindow = (index: number, field: string, value: string) => {
    setScheduleWindows(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    setSaveResult(null)
  }

  const handleUpdateCronSchedule = async (jobName: string, newSchedule: string) => {
    try {
      setSaving(true)
      setSaveResult(null)

      const sql = `-- Update cron job schedule
SELECT cron.unschedule('${jobName}');

SELECT cron.schedule(
  '${jobName}',
  '${newSchedule}',
  $$
  SELECT
    net.http_post(
      url:='https://uchmopqiylywnemvjttl.supabase.co/functions/v1/${jobName.replace('-job', '')}',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);`

      await navigator.clipboard.writeText(sql)

      setSaveResult({
        success: true,
        message: `SQL copied! Open SQL Editor and execute:\nhttps://app.supabase.com/project/uchmopqiylywnemvjttl/sql/new`,
      })

      if (jobName === 'telegram-scraper-job') {
        setTelegramScraperSchedule(newSchedule)
      } else if (jobName === 'fetch-news-hourly') {
        setFetchNewsSchedule(newSchedule)
      }
    } catch (error) {
      const sql = `-- Copy this SQL manually
SELECT cron.unschedule('${jobName}');

SELECT cron.schedule('${jobName}', '${newSchedule}', $$
  SELECT net.http_post(
    url:='https://uchmopqiylywnemvjttl.supabase.co/functions/v1/${jobName.replace('-job', '')}',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('app.settings.service_role_key')),
    body:='{}'::jsonb
  );
$$);`

      console.log('SQL to copy:', sql)

      setSaveResult({
        success: false,
        message: 'Copy error. SQL printed to console (F12).',
      })
    } finally {
      setSaving(false)
    }
  }

  const formatScheduleDescription = (cronExpression: string) => {
    const preset = CRON_PRESETS.find(p => p.value === cronExpression)
    return preset ? preset.label : cronExpression
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Clock className="h-7 w-7" />
          Automation Schedule
        </h2>
        <p className="text-gray-300 text-sm mt-1">
          Configure how often automatic scraping and news updates run
        </p>
      </div>

      {/* Save Result */}
      {saveResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            saveResult.success
              ? 'bg-green-500/10 border-green-500/50 text-green-300'
              : 'bg-red-500/10 border-red-500/50 text-red-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {saveResult.success ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm whitespace-pre-wrap">{saveResult.message}</p>
          </div>
        </motion.div>
      )}

      {/* Stream Mode Toggle */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${streamMode === 'streams' ? 'bg-blue-500/20' : 'bg-gray-500/20'}`}>
              {streamMode === 'streams' ? (
                <Layers className="h-6 w-6 text-blue-400" />
              ) : (
                <ArrowRightLeft className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Pipeline Mode</h3>
              <p className="text-sm text-gray-400 mt-1">
                {streamMode === 'streams'
                  ? '3-Stream: Website + Video Digest + Top Social'
                  : 'Legacy: auto-publish all articles with full processing'}
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setStreamMode(streamMode === 'streams' ? 'legacy' : 'streams'); setSaveResult(null) }}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 cursor-pointer ${
              streamMode === 'streams' ? 'bg-blue-500' : 'bg-gray-600'
            } ${hasUnsavedStreamModeChanges ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}`}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ left: streamMode === 'streams' ? '2rem' : '0.25rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

        <div className={`mt-4 p-3 rounded-lg ${streamMode === 'streams' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-gray-500/10 border border-gray-500/30'}`}>
          {streamMode === 'streams' ? (
            <div className="space-y-2">
              <p className="text-sm text-blue-300 font-medium">3-Stream Pipeline:</p>
              <ul className="text-sm text-blue-200 space-y-1 ml-4 list-disc">
                <li>Stream 1: All articles → website (1 language, original images)</li>
                <li>Stream 2: Daily video digest at 07:00 Oslo (LLM selects top-10)</li>
                <li>Stream 3: Top articles → social media with AI images</li>
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-300">
              All articles get full 3-language rewrite + AI image + auto social posting. Higher cost, more social posts.
            </p>
          )}
        </div>

        {/* Stream settings (only visible in streams mode) */}
        {streamMode === 'streams' && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Website Language</label>
                <select
                  value={rewriteLanguage}
                  onChange={(e) => { setRewriteLanguage(e.target.value); setSaveResult(null) }}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                >
                  <option value="en">English</option>
                  <option value="no">Norwegian</option>
                  <option value="ua">Ukrainian</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Top N for Social</label>
                <select
                  value={topN}
                  onChange={(e) => { setTopN(parseInt(e.target.value, 10)); setSaveResult(null) }}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} articles/day</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {hasUnsavedStreamModeChanges && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveStreamMode}
              disabled={streamModeLoading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {streamModeLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Pipeline Mode
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Pre-moderation Toggle */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${preModerationEnabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
              {preModerationEnabled ? (
                <Shield className="h-6 w-6 text-green-400" />
              ) : (
                <ShieldOff className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">AI Pre-moderation</h3>
              <p className="text-sm text-gray-400 mt-1">
                {preModerationEnabled
                  ? 'AI filters spam and ads before sending posts to Telegram bot'
                  : 'All posts are auto-approved and sent directly to Telegram bot'}
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={togglePreModeration}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 cursor-pointer ${
              preModerationEnabled ? 'bg-green-500' : 'bg-gray-600'
            } ${hasUnsavedPreModerationChanges ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}`}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ left: preModerationEnabled ? '2rem' : '0.25rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>
        <div className={`mt-4 p-3 rounded-lg ${preModerationEnabled ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
          <p className={`text-sm ${preModerationEnabled ? 'text-green-300' : 'text-yellow-300'}`}>
            {preModerationEnabled
              ? 'Posts are analyzed by AI for spam, ads, and low-quality content. Only approved posts appear in Telegram bot for final moderation.'
              : 'Warning: All scraped posts will be sent to Telegram bot without AI filtering. This may include spam and advertisements.'}
          </p>
        </div>

        {/* Save button - appears when there are unsaved changes */}
        {hasUnsavedPreModerationChanges && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={savePreModeration}
              disabled={preModerationLoading}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {preModerationLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Pre-moderation Setting
                </>
              )}
            </motion.button>
            <p className="text-xs text-yellow-400 mt-2 text-center">
              Click to save your changes. Current setting is not saved yet.
            </p>
          </motion.div>
        )}
      </div>

      {/* Auto-Publish Toggle */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${autoPublishEnabled ? 'bg-orange-500/20' : 'bg-gray-500/20'}`}>
              {autoPublishEnabled ? (
                <Zap className="h-6 w-6 text-orange-400" />
              ) : (
                <ZapOff className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Auto-Publish News</h3>
              <p className="text-sm text-gray-400 mt-1">
                {autoPublishEnabled
                  ? 'News is published automatically with AI-generated images and social posts'
                  : 'News goes through manual Telegram bot moderation'}
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleAutoPublish}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 cursor-pointer ${
              autoPublishEnabled ? 'bg-orange-500' : 'bg-gray-600'
            } ${hasUnsavedAutoPublishChanges ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}`}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ left: autoPublishEnabled ? '2rem' : '0.25rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

        <div className={`mt-4 p-3 rounded-lg ${autoPublishEnabled ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-gray-500/10 border border-gray-500/30'}`}>
          <p className={`text-sm ${autoPublishEnabled ? 'text-orange-300' : 'text-gray-300'}`}>
            {autoPublishEnabled
              ? '⚠️ No human review! AI selects image variants, generates images in all languages, rewrites content, and posts to social media automatically.'
              : 'Standard workflow: scraped posts are sent to Telegram bot where a moderator reviews and publishes them manually.'}
          </p>
        </div>

        {/* Expanded config section (when enabled) */}
        {autoPublishEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-4"
          >
            {/* Platform checkboxes */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Social Media Platforms:</label>
              <div className="flex gap-3">
                {[
                  { id: 'linkedin', label: '🔗 LinkedIn' },
                  { id: 'facebook', label: '📘 Facebook' },
                  { id: 'instagram', label: '📸 Instagram' }
                ].map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                      autoPublishPlatforms.includes(platform.id)
                        ? 'bg-orange-600 border-orange-500 text-white'
                        : 'bg-white/5 border-white/20 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {platform.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language checkboxes */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Languages (images + social posts):</label>
              <div className="flex gap-3">
                {[
                  { id: 'en', label: '🇬🇧 English' },
                  { id: 'no', label: '🇳🇴 Norwegian' },
                  { id: 'ua', label: '🇺🇦 Ukrainian' }
                ].map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => toggleLanguage(lang.id)}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                      autoPublishLanguages.includes(lang.id)
                        ? 'bg-orange-600 border-orange-500 text-white'
                        : 'bg-white/5 border-white/20 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-300">
              <p>
                Each article will generate: <strong className="text-orange-300">{autoPublishLanguages.length}</strong> image(s)
                {' + '}
                <strong className="text-orange-300">{autoPublishPlatforms.length * autoPublishLanguages.length}</strong> social post(s)
                {' '}({autoPublishPlatforms.length} platforms × {autoPublishLanguages.length} languages)
              </p>
            </div>
          </motion.div>
        )}

        {/* Save button */}
        {hasUnsavedAutoPublishChanges && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveAutoPublish}
              disabled={autoPublishLoading || (autoPublishEnabled && (autoPublishPlatforms.length === 0 || autoPublishLanguages.length === 0))}
              className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {autoPublishLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Auto-Publish Settings
                </>
              )}
            </motion.button>
            <p className="text-xs text-yellow-400 mt-2 text-center">
              Click to save your changes. Current setting is not saved yet.
            </p>
          </motion.div>
        )}
      </div>

      {/* Video Generation Toggle */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${videoGenerationEnabled ? 'bg-violet-500/20' : 'bg-gray-500/20'}`}>
              {videoGenerationEnabled ? (
                <Video className="h-6 w-6 text-violet-400" />
              ) : (
                <VideoOff className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Remotion Video Generation</h3>
              <p className="text-sm text-gray-400 mt-1">
                {videoGenerationEnabled
                  ? 'Videos are enhanced with AI voiceover, subtitles, and branding'
                  : 'Raw videos are uploaded directly to YouTube without processing'}
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleVideoGeneration}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 cursor-pointer ${
              videoGenerationEnabled ? 'bg-violet-500' : 'bg-gray-600'
            } ${hasUnsavedVideoGenerationChanges ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}`}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ left: videoGenerationEnabled ? '2rem' : '0.25rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>
        <div className={`mt-4 p-3 rounded-lg ${videoGenerationEnabled ? 'bg-violet-500/10 border border-violet-500/30' : 'bg-gray-500/10 border border-gray-500/30'}`}>
          <p className={`text-sm ${videoGenerationEnabled ? 'text-violet-300' : 'text-gray-300'}`}>
            {videoGenerationEnabled
              ? 'Pipeline: Telegram video → AI script → TTS voiceover → Remotion render (subtitles + branding) → YouTube upload'
              : 'Pipeline: Telegram video → YouTube upload (no enhancement)'}
          </p>
        </div>

        {hasUnsavedVideoGenerationChanges && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveVideoGeneration}
              disabled={videoGenerationLoading}
              className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {videoGenerationLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Video Generation Setting
                </>
              )}
            </motion.button>
            <p className="text-xs text-yellow-400 mt-2 text-center">
              Click to save your changes. Current setting is not saved yet.
            </p>
          </motion.div>
        )}
      </div>

      {/* Publishing Schedule */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${scheduleEnabled ? 'bg-blue-500/20' : 'bg-gray-500/20'}`}>
              <Calendar className={`h-6 w-6 ${scheduleEnabled ? 'text-blue-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Publishing Schedule</h3>
              <p className="text-sm text-gray-400 mt-1">
                {scheduleEnabled
                  ? 'Articles are queued and published at optimal engagement times'
                  : 'Presets fire immediately (may cause timeouts with multiple clicks)'}
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setScheduleEnabled(!scheduleEnabled); setSaveResult(null) }}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 cursor-pointer ${
              scheduleEnabled ? 'bg-blue-500' : 'bg-gray-600'
            } ${hasUnsavedScheduleChanges ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}`}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ left: scheduleEnabled ? '2rem' : '0.25rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

        {scheduleEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-4"
          >
            {/* Window editor */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Publishing Windows (Oslo time):</label>
              <div className="space-y-2">
                {scheduleWindows.map((win, i) => (
                  <div key={win.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                    <span className="text-sm text-white font-medium w-20">{win.label}</span>
                    <input
                      type="time"
                      value={win.start}
                      onChange={(e) => updateWindow(i, 'start', e.target.value)}
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="time"
                      value={win.end}
                      onChange={(e) => updateWindow(i, 'end', e.target.value)}
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white"
                    />
                    <span className="text-xs text-gray-500">
                      {win.types.includes('heavy') ? 'heavy+light' : 'light only'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Slot interval */}
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Interval (min):</label>
                <select
                  value={slotMinutes}
                  onChange={(e) => { setSlotMinutes(parseInt(e.target.value)); setSaveResult(null) }}
                  className="bg-white/10 border border-white/20 rounded px-3 py-1.5 text-sm text-white"
                >
                  {[5, 7, 10, 15, 20, 30].map(v => (
                    <option key={v} value={v} className="bg-gray-800">{v} min</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Max/day:</label>
                <input
                  type="number"
                  value={maxPerDay}
                  onChange={(e) => { setMaxPerDay(parseInt(e.target.value) || 20); setSaveResult(null) }}
                  min={1}
                  max={100}
                  className="bg-white/10 border border-white/20 rounded px-3 py-1.5 text-sm text-white w-20"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-300">
              {(() => {
                const totalSlots = scheduleWindows.reduce((acc, w) => {
                  const [sh, sm] = w.start.split(':').map(Number)
                  const [eh, em] = w.end.split(':').map(Number)
                  const minutes = (eh * 60 + em) - (sh * 60 + sm)
                  return acc + Math.floor(minutes / slotMinutes)
                }, 0)
                return (
                  <p>
                    ~<strong className="text-blue-300">{totalSlots}</strong> slots/day across{' '}
                    <strong className="text-blue-300">{scheduleWindows.length}</strong> windows,{' '}
                    <strong className="text-blue-300">{slotMinutes}</strong>min intervals
                    (max <strong className="text-blue-300">{maxPerDay}</strong>/day)
                  </p>
                )
              })()}
            </div>
          </motion.div>
        )}

        {hasUnsavedScheduleChanges && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveScheduleSettings}
              disabled={scheduleLoading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {scheduleLoading ? (
                <><RefreshCw className="h-5 w-5 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-5 w-5" /> Save Schedule Settings</>
              )}
            </motion.button>
            <p className="text-xs text-yellow-400 mt-2 text-center">Click to save. Current setting is not saved yet.</p>
          </motion.div>
        )}
      </div>

      {/* Telegram Scraper Schedule */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Telegram Scraper
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Telegram channel scraping frequency
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Current schedule:</div>
            <div className="text-white font-mono text-sm mt-1">
              {formatScheduleDescription(telegramScraperSchedule)}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-gray-300">
            Select run frequency:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CRON_PRESETS.map((preset) => (
              <motion.button
                key={preset.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTelegramScraperSchedule(preset.value)}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  telegramScraperSchedule === preset.value
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                }`}
              >
                <div className="text-sm font-medium">{preset.label}</div>
                <div className="text-xs opacity-70 mt-1">{preset.value}</div>
              </motion.button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleUpdateCronSchedule('telegram-scraper-job', telegramScraperSchedule)}
            disabled={saving}
            className="w-full mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Telegram Schedule
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* RSS Fetch Schedule */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              RSS Fetch
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              RSS feed update frequency
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Current schedule:</div>
            <div className="text-white font-mono text-sm mt-1">
              {formatScheduleDescription(fetchNewsSchedule)}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-gray-300">
            Select run frequency:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CRON_PRESETS.map((preset) => (
              <motion.button
                key={preset.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFetchNewsSchedule(preset.value)}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  fetchNewsSchedule === preset.value
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                }`}
              >
                <div className="text-sm font-medium">{preset.label}</div>
                <div className="text-xs opacity-70 mt-1">{preset.value}</div>
              </motion.button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleUpdateCronSchedule('fetch-news-hourly', fetchNewsSchedule)}
            disabled={saving}
            className="w-full mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save RSS Schedule
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold mb-2">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-300">
              <li>Telegram Scraper - automatically collects new posts from Telegram channels</li>
              <li>RSS Fetch - updates news from RSS feeds</li>
              <li>Each source also has its own individual interval (configured separately)</li>
              <li>Changes apply immediately after saving</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
