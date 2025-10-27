import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface CronSchedule {
  schedule: string;
  label: string;
  description: string;
}

const schedules: CronSchedule[] = [
  { schedule: '*/30 * * * *', label: 'Every 30 minutes', description: 'Check for new articles twice every hour' },
  { schedule: '0 * * * *', label: 'Every hour', description: 'Check for new articles once per hour' },
  { schedule: '0 */2 * * *', label: 'Every 2 hours', description: 'Check for new articles every 2 hours' },
  { schedule: '0 */3 * * *', label: 'Every 3 hours', description: 'Check for new articles every 3 hours' },
  { schedule: '0 */6 * * *', label: 'Every 6 hours', description: 'Check for new articles 4 times per day' },
  { schedule: '0 */12 * * *', label: 'Every 12 hours', description: 'Check for new articles twice per day' },
  { schedule: '0 9 * * *', label: 'Daily at 9:00 AM', description: 'Check for new articles once per day at 9 AM' },
];

export const CronSettingsManager = () => {
  const [currentSchedule] = useState<string>('0 * * * *'); // Default: hourly
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [manualTriggerLoading, setManualTriggerLoading] = useState(false);

  // Note: CRON schedule updates require SQL execution in Supabase Dashboard
  // This component provides manual trigger and schedule reference

  const handleManualTrigger = async () => {
    setManualTriggerLoading(true);
    setMessage(null);

    try {
      // Get Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/monitor-news`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.processed > 0) {
        setMessage({
          type: 'success',
          text: `Successfully checked ${result.checked} sources and sent ${result.processed} articles to Telegram!`
        });
      } else {
        setMessage({
          type: 'success',
          text: `Checked ${result.checked} sources. No new articles found.`
        });
      }
    } catch (error) {
      console.error('Failed to trigger monitoring:', error);
      setMessage({ type: 'error', text: 'Failed to trigger monitoring. Check console for details.' });
    } finally {
      setManualTriggerLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Monitoring Schedule</h2>
        <p className="text-gray-300 text-sm">Configure how often to check for new articles</p>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-500/30 text-green-300'
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <p className="text-sm">{message.text}</p>
        </motion.div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-2">How it works:</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• System automatically monitors configured news sources</li>
          <li>• New articles are sent to your Telegram bot: @{import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot'}</li>
          <li>• You approve/reject each article via Telegram buttons</li>
          <li>• Approved articles are rewritten by AI and published in 3 languages</li>
        </ul>
      </div>

      {/* Current Schedule */}
      <div className="bg-white/5 border border-white/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-6 w-6 text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Current Schedule</h3>
            <p className="text-gray-400 text-sm">
              {schedules.find(s => s.schedule === currentSchedule)?.label || 'Custom schedule'}
            </p>
          </div>
        </div>
        <p className="text-gray-300 text-sm font-mono bg-black/20 p-3 rounded">
          {currentSchedule}
        </p>
      </div>

      {/* Available Schedules Reference */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Available Schedule Options:</h3>
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div
              key={schedule.schedule}
              className="p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm">{schedule.label}</h4>
                  <p className="text-gray-400 text-xs">{schedule.description}</p>
                </div>
                <code className="text-gray-400 text-xs font-mono bg-black/30 px-2 py-1 rounded">
                  {schedule.schedule}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to Change Schedule */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-2">How to Change Schedule:</h3>
        <ol className="text-gray-300 text-sm space-y-2 ml-4 list-decimal">
          <li>Open Supabase Dashboard → SQL Editor</li>
          <li>Run: <code className="bg-black/30 px-2 py-0.5 rounded text-xs">SELECT cron.unschedule('monitor-news-sources');</code></li>
          <li>Copy schedule code from "Available Options" above</li>
          <li>Run: <code className="bg-black/30 px-2 py-0.5 rounded text-xs">SELECT cron.schedule('monitor-news-sources', 'SCHEDULE_HERE', $$...$$ );</code></li>
          <li>Or use the manual trigger button below to check immediately</li>
        </ol>
      </div>

      {/* Manual Trigger Button */}
      <div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleManualTrigger}
          disabled={manualTriggerLoading}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold shadow-lg"
        >
          <Clock className="h-6 w-6" />
          {manualTriggerLoading ? 'Checking Sources...' : 'Check for News Now'}
        </motion.button>
        <p className="text-gray-400 text-xs text-center mt-2">
          Click to manually check all news sources and send new articles to Telegram
        </p>
      </div>
    </div>
  );
};
