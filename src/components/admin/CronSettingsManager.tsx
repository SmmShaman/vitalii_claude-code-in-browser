import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

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
  const [currentSchedule, setCurrentSchedule] = useState<string>('0 * * * *');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('0 * * * *');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [manualTriggerLoading, setManualTriggerLoading] = useState(false);

  useEffect(() => {
    loadCurrentSchedule();
  }, []);

  const loadCurrentSchedule = async () => {
    try {
      // Query pg_cron to get current schedule
      const { data, error } = await supabase.rpc('get_cron_schedule');

      if (error) {
        console.error('Failed to load schedule:', error);
        // Default to hourly if can't load
        setCurrentSchedule('0 * * * *');
        setSelectedSchedule('0 * * * *');
        return;
      }

      if (data && data.length > 0) {
        setCurrentSchedule(data[0].schedule);
        setSelectedSchedule(data[0].schedule);
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
    }
  };

  const handleUpdateSchedule = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // First, unschedule the old job
      const { error: unscheduleError } = await supabase.rpc('unschedule_cron_job', {
        job_name: 'monitor-news-sources'
      });

      if (unscheduleError) {
        console.error('Failed to unschedule:', unscheduleError);
      }

      // Then, create new schedule
      const { error: scheduleError } = await supabase.rpc('schedule_cron_job', {
        job_name: 'monitor-news-sources',
        schedule: selectedSchedule
      });

      if (scheduleError) throw scheduleError;

      setCurrentSchedule(selectedSchedule);
      setMessage({ type: 'success', text: 'Schedule updated successfully!' });
    } catch (error) {
      console.error('Failed to update schedule:', error);
      setMessage({ type: 'error', text: 'Failed to update schedule. Check console for details.' });
    } finally {
      setLoading(false);
    }
  };

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

      {/* Schedule Options */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Select New Schedule:</h3>
        {schedules.map((schedule) => (
          <motion.div
            key={schedule.schedule}
            whileHover={{ scale: 1.01 }}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedSchedule === schedule.schedule
                ? 'bg-purple-500/20 border-purple-500'
                : 'bg-white/5 border-white/10 hover:border-white/30'
            }`}
            onClick={() => setSelectedSchedule(schedule.schedule)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-white font-medium">{schedule.label}</h4>
                <p className="text-gray-400 text-sm">{schedule.description}</p>
                <p className="text-gray-500 text-xs font-mono mt-1">{schedule.schedule}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedSchedule === schedule.schedule
                  ? 'border-purple-500 bg-purple-500'
                  : 'border-white/30'
              }`}>
                {selectedSchedule === schedule.schedule && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleUpdateSchedule}
          disabled={loading || currentSchedule === selectedSchedule}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
        >
          <Save className="h-5 w-5" />
          {loading ? 'Updating...' : 'Update Schedule'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleManualTrigger}
          disabled={manualTriggerLoading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
        >
          <Clock className="h-5 w-5" />
          {manualTriggerLoading ? 'Checking...' : 'Check Now (Manual)'}
        </motion.button>
      </div>

      {/* Warning */}
      {currentSchedule !== selectedSchedule && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-yellow-300 font-semibold">Unsaved Changes</h4>
              <p className="text-yellow-200/80 text-sm">
                Click "Update Schedule" to apply the new monitoring frequency.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
