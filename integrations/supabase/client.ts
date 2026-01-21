import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize Supabase client - throws error if credentials are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing! Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

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

export interface ContactEmailData extends ContactFormData {
  honeypot?: string;
  timestamp?: number;
}

export interface ContactEmailResponse {
  success: boolean;
  message: string;
}

/**
 * Send contact form via Edge Function (with email delivery)
 * Includes spam protection: honeypot, timestamp check, rate limiting
 */
export const sendContactEmail = async (data: ContactEmailData): Promise<ContactEmailResponse> => {
  // If Supabase is not configured, simulate success for demo purposes
  if (!isSupabaseConfigured()) {
    console.log('📧 Contact form submission (Supabase not configured):', data);
    return {
      success: true,
      message: 'Form submitted successfully! (Demo mode - configure Supabase to enable email delivery)'
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-contact-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to send message. Please try again.',
      };
    }

    return result;
  } catch (error) {
    console.error('Error calling send-contact-email:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
    };
  }
};

/**
 * @deprecated Use sendContactEmail instead for email delivery
 * Legacy function that only saves to database without sending email
 */
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

// ============================================
// NEWS API
// ============================================

export interface NewsFilters {
  limit?: number;
  offset?: number;
  tags?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Get latest news (2-3 items for Bento Grid)
 */
export const getLatestNews = async (limit: number = 3) => {
  if (!isSupabaseConfigured()) {
    console.warn('📰 Supabase not configured - returning empty news');
    return [];
  }

  const { data, error } = await supabase
    .from('news')
    .select(`
      id,
      title_en,
      title_no,
      title_ua,
      description_en,
      description_no,
      description_ua,
      slug_en,
      slug_no,
      slug_ua,
      image_url,
      processed_image_url,
      original_url,
      source_link,
      tags,
      published_at,
      views_count,
      video_url,
      video_type,
      source_id,
      news_sources(name, category)
    `)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching latest news:', error);
    return [];
  }

  // Transform data to match LatestNews type structure
  const transformedData = data?.map(item => ({
    id: item.id,
    title_en: item.title_en,
    title_no: item.title_no,
    title_ua: item.title_ua,
    description_en: item.description_en,
    description_no: item.description_no,
    description_ua: item.description_ua,
    slug_en: item.slug_en,
    slug_no: item.slug_no,
    slug_ua: item.slug_ua,
    image_url: item.image_url,
    processed_image_url: item.processed_image_url,
    original_url: item.original_url,
    source_link: item.source_link,
    tags: item.tags,
    published_at: item.published_at,
    views_count: item.views_count,
    video_url: item.video_url,
    video_type: item.video_type,
    source_name: (item as any).news_sources?.name || null,
    source_category: (item as any).news_sources?.category || null,
  })) || [];

  // Summary log
  const videoCount = transformedData.filter(item => item.video_url).length;
  const imageCount = transformedData.filter(item => item.image_url).length;
  console.log(`📰 Loaded ${transformedData.length} news: ${videoCount} with video, ${imageCount} with images`);

  return transformedData;
};

/**
 * Get all news with pagination and filters
 */
export const getAllNews = async (filters: NewsFilters = {}) => {
  if (!isSupabaseConfigured()) {
    console.warn('📰 Supabase not configured - returning empty news');
    return { data: [], count: 0 };
  }

  const { limit = 10, offset = 0, tags, search, dateFrom, dateTo } = filters;

  let query = supabase
    .from('news')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  // Apply filters
  if (tags && tags.length > 0) {
    query = query.contains('tags', tags);
  }

  if (search) {
    query = query.or(`title_en.ilike.%${search}%,title_no.ilike.%${search}%,title_ua.ilike.%${search}%,description_en.ilike.%${search}%,description_no.ilike.%${search}%,description_ua.ilike.%${search}%`);
  }

  if (dateFrom) {
    query = query.gte('published_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('published_at', dateTo);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching all news:', error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
};

/**
 * Get single news item by ID
 */
export const getNewsById = async (id: string) => {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching news by id:', error);
    return null;
  }

  // Increment view count
  if (data) {
    await supabase
      .from('news')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', id);
  }

  return data;
};

export const getNewsBySlug = async (slug: string, language: 'en' | 'no' | 'ua' = 'en') => {
  if (!isSupabaseConfigured()) return null;

  // First try the specified language slug
  const slugColumn = `slug_${language}`;
  let { data, error } = await supabase
    .from('news')
    .select('*')
    .eq(slugColumn, slug)
    .eq('is_published', true)
    .single();

  // If not found, try other slug columns
  if (error || !data) {
    const otherLanguages = ['en', 'no', 'ua'].filter(l => l !== language);

    for (const lang of otherLanguages) {
      const { data: foundData, error: foundError } = await supabase
        .from('news')
        .select('*')
        .eq(`slug_${lang}`, slug)
        .eq('is_published', true)
        .single();

      if (!foundError && foundData) {
        data = foundData;
        error = null;
        console.log(`News found with slug_${lang}:`, slug);
        break;
      }
    }
  }

  if (error || !data) {
    console.error('Error fetching news by slug:', slug, error);
    return null;
  }

  // Increment view count
  if (data) {
    await supabase
      .from('news')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', data.id);
  }

  return data;
};

// ============================================
// BLOG API
// ============================================

export interface BlogFilters {
  limit?: number;
  offset?: number;
  tags?: string[];
  category?: string;
  search?: string;
  featured?: boolean;
}

/**
 * Get latest blog posts (2-3 items for Bento Grid)
 */
export const getLatestBlogPosts = async (limit: number = 3) => {
  if (!isSupabaseConfigured()) {
    console.warn('📝 Supabase not configured - returning empty blog posts');
    return [];
  }

  const { data, error } = await supabase
    .from('latest_blog_posts')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching latest blog posts:', error);
    return [];
  }

  return data || [];
};

/**
 * Get all blog posts with pagination and filters
 */
export const getAllBlogPosts = async (filters: BlogFilters = {}) => {
  if (!isSupabaseConfigured()) {
    console.warn('📝 Supabase not configured - returning empty blog posts');
    return { data: [], count: 0 };
  }

  const { limit = 10, offset = 0, tags, category, search, featured } = filters;

  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  // Apply filters
  if (tags && tags.length > 0) {
    query = query.contains('tags', tags);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (featured !== undefined) {
    query = query.eq('is_featured', featured);
  }

  if (search) {
    query = query.or(`title_en.ilike.%${search}%,title_no.ilike.%${search}%,title_ua.ilike.%${search}%,description_en.ilike.%${search}%,description_no.ilike.%${search}%,description_ua.ilike.%${search}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching all blog posts:', error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
};

/**
 * Get single blog post by slug
 * Searches all slug columns (slug_en, slug_no, slug_ua) to find the post
 */
export const getBlogPostBySlug = async (slug: string, language: 'en' | 'no' | 'ua' = 'en') => {
  if (!isSupabaseConfigured()) return null;

  // First try the specified language slug
  const slugColumn = `slug_${language}`;
  let { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq(slugColumn, slug)
    .single();

  // If not found, try other slug columns
  if (error || !data) {
    const otherLanguages = ['en', 'no', 'ua'].filter(l => l !== language);

    for (const lang of otherLanguages) {
      const { data: foundData, error: foundError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq(`slug_${lang}`, slug)
        .single();

      if (!foundError && foundData) {
        data = foundData;
        error = null;
        console.log(`Blog post found with slug_${lang}:`, slug);
        break;
      }
    }
  }

  if (error || !data) {
    console.error('Error fetching blog post by slug:', slug, error);
    return null;
  }

  // Increment view count
  if (data) {
    await supabase
      .from('blog_posts')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', data.id);
  }

  return data;
};

/**
 * Get blog post by ID
 */
export const getBlogPostById = async (id: string) => {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching blog post by id:', error);
    return null;
  }

  return data;
};

/**
 * Get related blog posts based on shared tags
 * Returns posts that share at least one tag with the current post
 */
export const getRelatedBlogPosts = async (
  currentPostId: string,
  tags: string[],
  limit: number = 3
) => {
  if (!isSupabaseConfigured() || !tags || tags.length === 0) return [];

  // Get posts that share any of the same tags, excluding the current post
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title_en, title_no, title_ua, description_en, description_no, description_ua, slug_en, slug_no, slug_ua, image_url, tags, published_at')
    .eq('is_published', true)
    .neq('id', currentPostId)
    .overlaps('tags', tags)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching related blog posts:', error);
    return [];
  }

  return data || [];
};

/**
 * Get related news articles based on shared tags
 */
export const getRelatedNews = async (
  currentNewsId: string,
  tags: string[],
  limit: number = 3
) => {
  if (!isSupabaseConfigured() || !tags || tags.length === 0) return [];

  const { data, error } = await supabase
    .from('news')
    .select('id, title_en, title_no, title_ua, description_en, description_no, description_ua, slug_en, slug_no, slug_ua, image_url, tags, published_at')
    .eq('is_published', true)
    .neq('id', currentNewsId)
    .overlaps('tags', tags)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching related news:', error);
    return [];
  }

  return data || [];
};

// ============================================
// TAGS API
// ============================================

/**
 * Get all tags
 */
export const getAllTags = async () => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('usage_count', { ascending: false });

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  return data || [];
};
