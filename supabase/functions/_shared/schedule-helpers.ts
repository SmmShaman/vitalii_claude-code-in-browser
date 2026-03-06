/**
 * Scheduled Publishing helpers
 * Classifies content weight, computes next available slot, loads config.
 */

export interface ScheduleWindow {
  id: string
  start: string // "HH:MM"
  end: string
  types: string[] // ["heavy", "light"]
  label: string
}

export interface ScheduleConfig {
  enabled: boolean
  windows: ScheduleWindow[]
  slotMinutes: number
  maxPerDay: number
}

/**
 * Classify content as 'heavy' or 'light'.
 * Heavy = long RSS articles (>1500 chars original content).
 * Light = short articles, video posts, Telegram sources.
 */
export function classifyContentWeight(news: any): 'heavy' | 'light' {
  if (news.video_url || news.original_video_url) return 'light'
  const contentLength = (news.original_content || '').length
  const isRss = !!(news.rss_source_url || news.source_type === 'rss')
  if (contentLength > 1500 && isRss) return 'heavy'
  return 'light'
}

/**
 * Load schedule configuration from api_settings.
 */
export async function loadScheduleConfig(supabase: any): Promise<ScheduleConfig> {
  const { data: settings } = await supabase
    .from('api_settings')
    .select('key_name, key_value')
    .in('key_name', [
      'PUBLISH_SCHEDULE_ENABLED',
      'PUBLISH_SCHEDULE_WINDOWS',
      'PUBLISH_SCHEDULE_SLOT_MINUTES',
      'PUBLISH_SCHEDULE_MAX_PER_DAY'
    ])

  const getValue = (key: string, fallback: string) =>
    settings?.find((s: any) => s.key_name === key)?.key_value || fallback

  let windows: ScheduleWindow[] = []
  try {
    const parsed = JSON.parse(getValue('PUBLISH_SCHEDULE_WINDOWS', '{"windows":[]}'))
    windows = parsed.windows || []
  } catch {
    console.warn('Failed to parse PUBLISH_SCHEDULE_WINDOWS')
  }

  return {
    enabled: getValue('PUBLISH_SCHEDULE_ENABLED', 'true') === 'true',
    windows,
    slotMinutes: parseInt(getValue('PUBLISH_SCHEDULE_SLOT_MINUTES', '7'), 10),
    maxPerDay: parseInt(getValue('PUBLISH_SCHEDULE_MAX_PER_DAY', '20'), 10),
  }
}

/**
 * Get current time in Oslo timezone.
 * Returns a Date where getHours()/getMinutes() return Oslo local time.
 * Uses Intl.DateTimeFormat which works reliably on Deno (Supabase Edge Functions).
 */
function getOsloNow(): Date {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0')

  // Create Date where UTC hours = Oslo local hours (Deno runtime is UTC,
  // so getHours() === getUTCHours(), giving us Oslo-local values for comparison)
  return new Date(Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour'), get('minute'), get('second')
  ))
}

/**
 * Parse "HH:MM" string into { hours, minutes }.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number)
  return { hours: h, minutes: m }
}

/**
 * Create a Date at a given HH:MM on a specific date in Oslo time.
 */
function dateAtTime(baseDate: Date, timeStr: string): Date {
  const { hours, minutes } = parseTime(timeStr)
  const d = new Date(baseDate)
  d.setHours(hours, minutes, 0, 0)
  return d
}

/**
 * Compute the next available scheduled slot.
 * Algorithm:
 * 1. Load existing scheduled times for today+tomorrow from DB
 * 2. Filter windows by content weight (heavy -> morning only; light -> all)
 * 3. For each eligible window starting from now: generate candidate slots,
 *    skip past/occupied slots, return first available
 * 4. If today full -> try tomorrow
 */
export async function computeScheduledTime(
  contentWeight: 'heavy' | 'light',
  config: ScheduleConfig,
  supabase: any
): Promise<{ scheduledAt: Date; window: string; windowLabel: string }> {
  const now = getOsloNow()

  // Try today, then tomorrow
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + dayOffset)

    // Start/end of target date for DB query
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    // Load already-scheduled articles for this date range
    const { data: scheduled } = await supabase
      .from('news')
      .select('scheduled_publish_at')
      .eq('auto_publish_status', 'scheduled')
      .gte('scheduled_publish_at', dayStart.toISOString())
      .lte('scheduled_publish_at', dayEnd.toISOString())

    const occupiedTimes = new Set(
      (scheduled || []).map((r: any) => {
        const d = new Date(r.scheduled_publish_at)
        return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
      })
    )

    // Check max per day
    if (occupiedTimes.size >= config.maxPerDay) {
      console.log(`Day ${dayOffset} already has ${occupiedTimes.size} scheduled (max ${config.maxPerDay}), trying next day`)
      continue
    }

    // Filter windows by content weight
    const eligibleWindows = config.windows.filter(w =>
      w.types.includes(contentWeight)
    )

    for (const win of eligibleWindows) {
      const windowStart = dateAtTime(targetDate, win.start)
      const windowEnd = dateAtTime(targetDate, win.end)

      // Generate candidate slots within this window
      const cursor = new Date(windowStart)
      while (cursor < windowEnd) {
        const slotKey = `${cursor.getHours()}:${String(cursor.getMinutes()).padStart(2, '0')}`

        // Skip past slots (only relevant for today)
        if (dayOffset === 0 && cursor <= now) {
          cursor.setMinutes(cursor.getMinutes() + config.slotMinutes)
          continue
        }

        // Skip occupied slots
        if (!occupiedTimes.has(slotKey)) {
          return {
            scheduledAt: new Date(cursor),
            window: win.id,
            windowLabel: win.label,
          }
        }

        cursor.setMinutes(cursor.getMinutes() + config.slotMinutes)
      }
    }
  }

  // Absolute fallback: schedule 7 minutes from now
  const fallbackTime = new Date(now)
  fallbackTime.setMinutes(fallbackTime.getMinutes() + config.slotMinutes)
  console.warn('No available slot found in windows, using fallback time')
  return {
    scheduledAt: fallbackTime,
    window: 'fallback',
    windowLabel: 'Fallback',
  }
}

/**
 * Check if current Oslo time is inside any active publishing window.
 */
export function isInsidePublishingWindow(config: ScheduleConfig): { inside: boolean; currentWindow?: string } {
  const now = getOsloNow()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  for (const win of config.windows) {
    const { hours: sh, minutes: sm } = parseTime(win.start)
    const { hours: eh, minutes: em } = parseTime(win.end)
    const startMin = sh * 60 + sm
    const endMin = eh * 60 + em

    if (nowMinutes >= startMin && nowMinutes < endMin) {
      return { inside: true, currentWindow: win.id }
    }
  }

  return { inside: false }
}

/**
 * Count currently in-flight articles (active pipeline statuses).
 */
export async function countInFlight(supabase: any): Promise<number> {
  const { count } = await supabase
    .from('news')
    .select('id', { count: 'exact', head: true })
    .in('auto_publish_status', ['pending', 'variant_selection', 'image_generation', 'content_rewrite', 'social_posting'])

  return count || 0
}

/**
 * Format a scheduled time for Telegram display.
 */
export function formatScheduledTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
