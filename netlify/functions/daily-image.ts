import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BingImageResponse {
  images: Array<{
    url: string;
    urlbase: string;
    copyright: string;
    title: string;
    quiz: string;
  }>;
}

interface NasaApodResponse {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  copyright?: string;
  date: string;
  media_type: string;
}

// Fetch image from Bing
async function fetchBingImage(): Promise<any> {
  const response = await fetch(
    'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US'
  );
  const data: BingImageResponse = await response.json();
  const image = data.images[0];

  return {
    title: image.copyright.split('(')[0].trim(),
    description: image.copyright,
    imageUrl: `https://www.bing.com${image.url}`,
    thumbnailUrl: `https://www.bing.com${image.urlbase}_1920x1080.jpg`,
    source: 'bing',
    copyright: image.copyright,
  };
}

// Fetch image from NASA APOD
async function fetchNasaImage(): Promise<any> {
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const response = await fetch(
    `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`
  );
  const data: NasaApodResponse = await response.json();

  // NASA APOD might return video, skip those
  if (data.media_type !== 'image') {
    throw new Error('NASA APOD returned video, not image');
  }

  return {
    title: data.title,
    description: data.explanation,
    imageUrl: data.hdurl || data.url,
    thumbnailUrl: data.url,
    source: 'nasa',
    copyright: data.copyright || 'NASA',
  };
}

// Simple color analysis (will be enhanced client-side with Vibrant.js)
function analyzeColorsSimple(source: string): any {
  // Provide default color schemes based on source
  if (source === 'nasa') {
    return {
      vibrant: '#1E3A8A',
      darkVibrant: '#0F172A',
      lightVibrant: '#60A5FA',
      muted: '#475569',
      darkMuted: '#1E293B',
      lightMuted: '#94A3B8',
    };
  }
  // Bing default
  return {
    vibrant: '#3B82F6',
    darkVibrant: '#1E40AF',
    lightVibrant: '#93C5FD',
    muted: '#6B7280',
    darkMuted: '#374151',
    lightMuted: '#D1D5DB',
  };
}

// Detect theme and effect based on title/description
function detectThemeAndEffect(title: string, description: string): { theme: string; effect: string } {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('snow') || text.includes('winter') || text.includes('ice')) {
    return { theme: 'winter', effect: 'snow' };
  }
  if (text.includes('rain') || text.includes('storm') || text.includes('cloud')) {
    return { theme: 'rain', effect: 'rain' };
  }
  if (text.includes('star') || text.includes('galaxy') || text.includes('space') || text.includes('nebula')) {
    return { theme: 'space', effect: 'stars' };
  }
  if (text.includes('fire') || text.includes('volcano') || text.includes('sun')) {
    return { theme: 'fire', effect: 'sparkles' };
  }
  if (text.includes('flower') || text.includes('spring') || text.includes('garden')) {
    return { theme: 'nature', effect: 'particles' };
  }

  // Default
  return { theme: 'abstract', effect: 'particles' };
}

export const handler: Handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if we already have today's image
    const { data: existing, error: fetchError } = await supabase
      .from('daily_images')
      .select('*')
      .eq('date', today)
      .single();

    if (existing && !fetchError) {
      console.log('Returning cached image for', today);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(existing),
      };
    }

    // Fetch new image
    console.log('Fetching new image for', today);
    const startTime = Date.now();

    // Try Bing first, fallback to NASA
    let imageData;
    try {
      imageData = await fetchBingImage();
    } catch (bingError) {
      console.warn('Bing fetch failed, trying NASA:', bingError);
      imageData = await fetchNasaImage();
    }

    const fetchDuration = Date.now() - startTime;

    // Analyze theme and effect
    const { theme, effect } = detectThemeAndEffect(imageData.title, imageData.description);
    const colors = analyzeColorsSimple(imageData.source);

    // Store in database
    const { data: newImage, error: insertError } = await supabase
      .from('daily_images')
      .insert({
        date: today,
        title: imageData.title,
        description: imageData.description,
        image_url: imageData.imageUrl,
        thumbnail_url: imageData.thumbnailUrl,
        source: imageData.source,
        copyright: imageData.copyright,
        colors,
        theme,
        effect,
        fetch_duration_ms: fetchDuration,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(newImage),
    };
  } catch (error: any) {
    console.error('Daily image function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch daily image',
        message: error.message,
      }),
    };
  }
};
