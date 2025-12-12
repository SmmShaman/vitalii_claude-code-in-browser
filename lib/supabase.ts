import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// News API
export const getLatestNews = async (limit: number = 3) => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('news')
    .select(`
      id,
      slug_en, slug_no, slug_ua,
      title_en, title_no, title_ua,
      description_en, description_no, description_ua,
      image_url, original_url, tags, published_at,
      views_count, video_url, video_type, source_id,
      news_sources!inner(name, category)
    `)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching news:', error);
    return [];
  }

  return data?.map(item => ({
    ...item,
    source_name: (item as any).news_sources?.name || null,
    source_category: (item as any).news_sources?.category || null,
  })) || [];
};

export const getNewsBySlug = async (slug: string) => {
  if (!isSupabaseConfigured()) return null;

  // Try all language slugs
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .or(`slug_en.eq.${slug},slug_no.eq.${slug},slug_ua.eq.${slug}`)
    .eq('is_published', true)
    .single();

  if (error) return null;
  return data;
};

export const getAllNewsSlugs = async () => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('news')
    .select('slug_en, slug_no, slug_ua')
    .eq('is_published', true);

  if (error) return [];

  const slugs: string[] = [];
  data?.forEach(item => {
    if (item.slug_en) slugs.push(item.slug_en);
    if (item.slug_no) slugs.push(item.slug_no);
    if (item.slug_ua) slugs.push(item.slug_ua);
  });
  return slugs;
};

// Blog API
export const getLatestBlogPosts = async (limit: number = 3) => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }

  return data || [];
};

export const getBlogPostBySlug = async (slug: string) => {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .or(`slug_en.eq.${slug},slug_no.eq.${slug},slug_ua.eq.${slug}`)
    .eq('is_published', true)
    .single();

  if (error) return null;
  return data;
};

export const getAllBlogSlugs = async () => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug_en, slug_no, slug_ua')
    .eq('is_published', true);

  if (error) return [];

  const slugs: string[] = [];
  data?.forEach(item => {
    if (item.slug_en) slugs.push(item.slug_en);
    if (item.slug_no) slugs.push(item.slug_no);
    if (item.slug_ua) slugs.push(item.slug_ua);
  });
  return slugs;
};
