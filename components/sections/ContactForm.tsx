'use client'

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { sendContactEmail, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useTranslations } from '@/contexts/TranslationContext';

export const ContactForm = () => {
  const { t } = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Honeypot field state (hidden from real users)
  const [honeypot, setHoneypot] = useState('');

  // Track when form was loaded (for timestamp check)
  const [formLoadTime] = useState(Date.now());

  // Client-side rate limiting
  const [lastSubmitTime, setLastSubmitTime] = useState<number | null>(null);
  const COOLDOWN_MS = 60000; // 1 minute between submissions

  const formSchema = z.object({
    name: z.string().min(1, t('name_required')),
    email: z.string().email(t('email_invalid')),
    message: z.string().min(1, t('message_required')),
  });

  type FormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  // Load last submit time from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('contactForm_lastSubmit');
    if (stored) {
      setLastSubmitTime(parseInt(stored, 10));
    }
  }, []);

  // Check if user is in cooldown period
  const isInCooldown = () => {
    if (!lastSubmitTime) return false;
    return Date.now() - lastSubmitTime < COOLDOWN_MS;
  };

  const getCooldownRemaining = () => {
    if (!lastSubmitTime) return 0;
    const remaining = COOLDOWN_MS - (Date.now() - lastSubmitTime);
    return Math.max(0, Math.ceil(remaining / 1000));
  };

  const onSubmit = async (data: FormData) => {
    // Client-side rate limiting
    if (isInCooldown()) {
      setSubmitStatus('error');
      setStatusMessage(`Please wait ${getCooldownRemaining()} seconds before sending another message.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setStatusMessage('');

    try {
      const result = await sendContactEmail({
        ...data,
        honeypot,
        timestamp: formLoadTime,
      });

      if (result.success) {
        setSubmitStatus('success');
        setStatusMessage(result.message || t('message_sent'));
        reset();

        // Update last submit time
        const now = Date.now();
        setLastSubmitTime(now);
        localStorage.setItem('contactForm_lastSubmit', now.toString());
      } else {
        setSubmitStatus('error');
        setStatusMessage(result.message || t('message_error'));
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
      setStatusMessage(t('message_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset status after 5 seconds
  useEffect(() => {
    if (submitStatus !== 'idle') {
      const timer = setTimeout(() => {
        setSubmitStatus('idle');
        setStatusMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  return (
    <div className="w-full h-full flex flex-col justify-center p-6">
      <div className="flex items-center gap-4 mb-6">
        <Mail className="w-12 h-12 text-blue-500" />
        <div>
          <h2 className="text-3xl font-bold text-white">{t('contact_title')}</h2>
          <p className="text-white/90">{t('contact_description')}</p>
        </div>
      </div>

      {/* Status messages */}
      {submitStatus === 'success' && (
        <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-100">{statusMessage}</div>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-100">{statusMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Honeypot field - hidden from real users, bots will fill it */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            opacity: 0,
            height: 0,
            width: 0,
            overflow: 'hidden',
          }}
        />

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
            {t('name')}
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="w-full px-3 py-3 bg-black/50 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder={t('name')}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
            {t('email')}
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="w-full px-3 py-3 bg-black/50 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder={t('email')}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
            {t('message')}
          </label>
          <textarea
            id="message"
            rows={4}
            {...register('message')}
            className="w-full px-3 py-3 bg-black/50 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
            placeholder={t('message')}
            disabled={isSubmitting}
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-400">{errors.message.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isInCooldown()}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('sending')}
            </>
          ) : isInCooldown() ? (
            <>
              <span>Wait {getCooldownRemaining()}s</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              {t('send_message')}
            </>
          )}
        </button>
      </form>
    </div>
  );
};
