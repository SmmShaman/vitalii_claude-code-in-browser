/**
 * Webhook Dispatch Helper
 *
 * Fire-and-forget dispatch to telegram-webhook-worker for heavy background operations.
 * The webhook returns immediately while the worker processes the task.
 */

export interface WorkerTask {
  action: string
  params: Record<string, any>
  telegram: {
    chatId: number
    messageId: number
    messageText: string
  }
}

/**
 * Dispatch a task to the background worker.
 * This is fire-and-forget - the webhook doesn't wait for the worker to finish.
 */
export function dispatchToWorker(task: WorkerTask): void {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

  fetch(`${SUPABASE_URL}/functions/v1/telegram-webhook-worker`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(task)
  }).catch(err => console.error('❌ Worker dispatch failed:', err))
}
