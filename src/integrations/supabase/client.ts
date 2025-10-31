import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client - throws error if credentials are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing! Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
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
  if (!supabase) {
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
      image_url,
      original_url,
      tags,
      published_at,
      views_count,
      video_url,
      video_type,
      source_id,
      news_sources!inner(name, category)
    `)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching latest news:', error);
    return [];
  }

  // Debug: Log raw data from database
  console.log('📰 Raw news data from DB - Total items:', data?.length);
  console.table(data?.map(item => ({
    title: item.title_en?.substring(0, 30),
    has_video: !!item.video_url,
    video_url: item.video_url?.substring(0, 50),
    video_type: item.video_type,
    has_image: !!item.image_url
  })));

  // Transform data to match LatestNews type structure
  const transformedData = data?.map(item => ({
    id: item.id,
    title_en: item.title_en,
    title_no: item.title_no,
    title_ua: item.title_ua,
    description_en: item.description_en,
    description_no: item.description_no,
    description_ua: item.description_ua,
    image_url: item.image_url,
    original_url: item.original_url,
    tags: item.tags,
    published_at: item.published_at,
    views_count: item.views_count,
    video_url: item.video_url,
    video_type: item.video_type,
    source_name: (item as any).news_sources?.name || null,
    source_category: (item as any).news_sources?.category || null,
  })) || [];

  // Debug: Log video items with details
  const videoItems = transformedData.filter(item => item.video_url);
  console.log('📹 Found', videoItems.length, 'video items out of', transformedData.length, 'total');

  videoItems.forEach((item, index) => {
    console.log(`📹 Video ${index + 1}:`, {
      title: item.title_en,
      video_url: item.video_url,
      video_type: item.video_type,
      has_image: !!item.image_url
    });
  });

  return transformedData;
};

/**
 * Get all news with pagination and filters
 */
export const getAllNews = async (filters: NewsFilters = {}) => {
  if (!supabase) {
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
  if (!supabase) return null;

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
  if (!supabase) {
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
  if (!supabase) {
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
 */
export const getBlogPostBySlug = async (slug: string, language: 'en' | 'no' | 'ua' = 'en') => {
  if (!supabase) return null;

  const slugColumn = `slug_${language}`;

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq(slugColumn, slug)
    .single();

  if (error) {
    console.error('Error fetching blog post by slug:', error);
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
  if (!supabase) return null;

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

// ============================================
// TAGS API
// ============================================

/**
 * Get all tags
 */
export const getAllTags = async () => {
  if (!supabase) return [];

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
