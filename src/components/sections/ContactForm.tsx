import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail } from 'lucide-react';
import { submitContactForm } from '../../integrations/supabase/client';
import { useTranslations } from '../../hooks/useTranslations';

export const ContactForm = () => {
  const { t } = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await submitContactForm(data);
      alert(t('message_sent'));
      reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(t('message_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center p-6">
      <div className="flex items-center gap-4 mb-6">
        <Mail className="w-12 h-12 text-blue-500" />
        <div>
          <h2 className="text-3xl font-bold text-white">{t('contact_title')}</h2>
          <p className="text-white/80">{t('contact_description')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
            {t('name')}
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="w-full px-3 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={t('name')}
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
            className="w-full px-3 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={t('email')}
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
            className="w-full px-3 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder={t('message')}
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-400">{errors.message.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t('sending') : t('send_message')}
        </button>
      </form>
    </div>
  );
};
