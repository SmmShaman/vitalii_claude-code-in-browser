import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

// Initialize Supabase client (required for admin features)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export const submitContactForm = async (data: ContactFormData) => {
  // If Supabase is not configured, simulate success for demo purposes
  if (!isSupabaseConfigured()) {
    console.log('📧 Contact form submission (Supabase not configured):', data);
    return {
      success: true,
      demo: true,
      message: 'Form submitted successfully! (Demo mode - configure Supabase to store submissions)'
    };
  }

  const { error } = await supabase
    .from('contact_forms')
    .insert([
      {
        name: data.name,
        email: data.email,
        message: data.message,
        created_at: new Date().toISOString(),
      }
    ]);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, demo: false };
};
