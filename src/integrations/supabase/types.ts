// ============================================
// Supabase Database Types
// Auto-generated types for type safety
// ============================================

export interface Database {
  public: {
    Tables: {
      contact_forms: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          email: string;
          message: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          email: string;
          message: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          email?: string;
          message?: string;
        };
      };
      news_sources: {
        Row: {
          id: string;
          name: string;
          url: string;
          rss_url: string | null;
          source_type: 'rss' | 'telegram' | 'web';
          category: string | null;
          is_active: boolean;
          fetch_interval: number;
          last_fetched_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          rss_url?: string | null;
          source_type?: 'rss' | 'telegram' | 'web';
          category?: string | null;
          is_active?: boolean;
          fetch_interval?: number;
          last_fetched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          rss_url?: string | null;
          source_type?: 'rss' | 'telegram' | 'web';
          category?: string | null;
          is_active?: boolean;
          fetch_interval?: number;
          last_fetched_at?: string | null;
          updated_at?: string;
        };
      };
      news: {
        Row: {
          id: string;
          source_id: string | null;
          original_title: string | null;
          original_content: string | null;
          original_url: string | null;
          image_url: string | null;
          title_en: string | null;
          content_en: string | null;
          description_en: string | null;
          slug_en: string | null;
          title_no: string | null;
          content_no: string | null;
          description_no: string | null;
          slug_no: string | null;
          title_ua: string | null;
          content_ua: string | null;
          description_ua: string | null;
          slug_ua: string | null;
          tags: string[] | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          is_rewritten: boolean;
          is_published: boolean;
          views_count: number;
        };
        Insert: {
          id?: string;
          source_id?: string | null;
          original_title?: string | null;
          original_content?: string | null;
          original_url?: string | null;
          image_url?: string | null;
          title_en?: string | null;
          content_en?: string | null;
          description_en?: string | null;
          slug_en?: string | null;
          title_no?: string | null;
          content_no?: string | null;
          description_no?: string | null;
          slug_no?: string | null;
          title_ua?: string | null;
          content_ua?: string | null;
          description_ua?: string | null;
          slug_ua?: string | null;
          tags?: string[] | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          is_rewritten?: boolean;
          is_published?: boolean;
          views_count?: number;
        };
        Update: {
          id?: string;
          source_id?: string | null;
          original_title?: string | null;
          original_content?: string | null;
          original_url?: string | null;
          image_url?: string | null;
          title_en?: string | null;
          content_en?: string | null;
          description_en?: string | null;
          slug_en?: string | null;
          title_no?: string | null;
          content_no?: string | null;
          description_no?: string | null;
          slug_no?: string | null;
          title_ua?: string | null;
          content_ua?: string | null;
          description_ua?: string | null;
          slug_ua?: string | null;
          tags?: string[] | null;
          published_at?: string | null;
          updated_at?: string;
          is_rewritten?: boolean;
          is_published?: boolean;
          views_count?: number;
        };
      };
      blog_posts: {
        Row: {
          id: string;
          author_id: string | null;
          title_en: string;
          content_en: string;
          description_en: string | null;
          slug_en: string | null;
          title_no: string | null;
          content_no: string | null;
          description_no: string | null;
          slug_no: string | null;
          title_ua: string | null;
          content_ua: string | null;
          description_ua: string | null;
          slug_ua: string | null;
          image_url: string | null;
          cover_image_url: string | null;
          tags: string[] | null;
          category: string | null;
          reading_time: number | null;
          views_count: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          is_published: boolean;
          is_featured: boolean;
        };
        Insert: {
          id?: string;
          author_id?: string | null;
          title_en: string;
          content_en: string;
          description_en?: string | null;
          slug_en?: string | null;
          title_no?: string | null;
          content_no?: string | null;
          description_no?: string | null;
          slug_no?: string | null;
          title_ua?: string | null;
          content_ua?: string | null;
          description_ua?: string | null;
          slug_ua?: string | null;
          image_url?: string | null;
          cover_image_url?: string | null;
          tags?: string[] | null;
          category?: string | null;
          reading_time?: number | null;
          views_count?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          is_published?: boolean;
          is_featured?: boolean;
        };
        Update: {
          id?: string;
          author_id?: string | null;
          title_en?: string;
          content_en?: string;
          description_en?: string | null;
          slug_en?: string | null;
          title_no?: string | null;
          content_no?: string | null;
          description_no?: string | null;
          slug_no?: string | null;
          title_ua?: string | null;
          content_ua?: string | null;
          description_ua?: string | null;
          slug_ua?: string | null;
          image_url?: string | null;
          cover_image_url?: string | null;
          tags?: string[] | null;
          category?: string | null;
          reading_time?: number | null;
          views_count?: number;
          published_at?: string | null;
          updated_at?: string;
          is_published?: boolean;
          is_featured?: boolean;
        };
      };
      ai_prompts: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          prompt_text: string;
          prompt_type: string;
          is_active: boolean;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          prompt_text: string;
          prompt_type?: string;
          is_active?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          prompt_text?: string;
          prompt_type?: string;
          is_active?: boolean;
          usage_count?: number;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          full_name: string | null;
          role: string;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          full_name?: string | null;
          role?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          full_name?: string | null;
          role?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          name_en: string;
          name_no: string | null;
          name_ua: string | null;
          slug: string;
          usage_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name_en: string;
          name_no?: string | null;
          name_ua?: string | null;
          slug: string;
          usage_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name_en?: string;
          name_no?: string | null;
          name_ua?: string | null;
          slug?: string;
          usage_count?: number;
        };
      };
    };
    Views: {
      latest_news: {
        Row: {
          id: string;
          title_en: string | null;
          title_no: string | null;
          title_ua: string | null;
          description_en: string | null;
          description_no: string | null;
          description_ua: string | null;
          image_url: string | null;
          original_url: string | null;
          tags: string[] | null;
          published_at: string | null;
          views_count: number;
          source_name: string | null;
          source_category: string | null;
        };
      };
      latest_blog_posts: {
        Row: {
          id: string;
          title_en: string;
          title_no: string | null;
          title_ua: string | null;
          description_en: string | null;
          description_no: string | null;
          description_ua: string | null;
          image_url: string | null;
          slug_en: string | null;
          slug_no: string | null;
          slug_ua: string | null;
          tags: string[] | null;
          category: string | null;
          reading_time: number | null;
          published_at: string | null;
          views_count: number;
          is_featured: boolean;
        };
      };
    };
  };
}

// Helper types
export type NewsItem = Database['public']['Tables']['news']['Row'];
export type NewsInsert = Database['public']['Tables']['news']['Insert'];
export type NewsUpdate = Database['public']['Tables']['news']['Update'];

export type BlogPost = Database['public']['Tables']['blog_posts']['Row'];
export type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert'];
export type BlogPostUpdate = Database['public']['Tables']['blog_posts']['Update'];

export type NewsSource = Database['public']['Tables']['news_sources']['Row'];
export type AIPrompt = Database['public']['Tables']['ai_prompts']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];

export type LatestNews = Database['public']['Views']['latest_news']['Row'];
export type LatestBlogPost = Database['public']['Views']['latest_blog_posts']['Row'];
