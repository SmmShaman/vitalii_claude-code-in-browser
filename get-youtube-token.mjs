#!/usr/bin/env node

/**
 * YouTube OAuth 2.0 Token Generator
 *
 * This script helps you get a refresh token for YouTube Data API v3
 *
 * Setup:
 * 1. Create .env file with:
 *    YOUTUBE_CLIENT_ID=your_client_id
 *    YOUTUBE_CLIENT_SECRET=your_client_secret
 * 2. Run: node get-youtube-token.mjs
 */

import http from 'http';
import { exec } from 'child_process';
import { readFileSync, existsSync } from 'fs';

// Load credentials from .env file
let CLIENT_ID, CLIENT_SECRET;

try {
  if (existsSync('.env')) {
    const envContent = readFileSync('.env', 'utf-8');
    const envLines = envContent.split('\n');

    for (const line of envLines) {
      const [key, value] = line.split('=');
      if (key === 'YOUTUBE_CLIENT_ID') CLIENT_ID = value.replace(/['"]/g, '').trim();
      if (key === 'YOUTUBE_CLIENT_SECRET') CLIENT_SECRET = value.replace(/['"]/g, '').trim();
    }
  }
} catch (error) {
  console.error('Error reading .env file:', error.message);
}

// Fallback to environment variables
CLIENT_ID = CLIENT_ID || process.env.YOUTUBE_CLIENT_ID;
CLIENT_SECRET = CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: Missing credentials!\n');
  console.error('Please create a .env file with:\n');
  console.error('YOUTUBE_CLIENT_ID=your_client_id');
  console.error('YOUTUBE_CLIENT_SECRET=your_client_secret\n');
  console.error('Or set environment variables:\n');
  console.error('export YOUTUBE_CLIENT_ID="your_client_id"');
  console.error('export YOUTUBE_CLIENT_SECRET="your_client_secret"\n');
  process.exit(1);
}
const REDIRECT_URI = 'http://localhost:3000/oauth-callback';
const PORT = 3000;

// YouTube API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl'
].join(' ');

console.log('🎬 YouTube OAuth Token Generator\n');
console.log('📋 Instructions:');
console.log('1. A browser will open automatically');
console.log('2. Sign in with your Google account');
console.log('3. Grant permissions to upload videos');
console.log('4. You will be redirected back here\n');

// Create HTTP server to receive OAuth callback
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth-callback')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('❌ Authorization failed:', error);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <h1>❌ Authorization Failed</h1>
          <p>Error: ${error}</p>
          <p>You can close this window.</p>
        </body>
      </html>
    `);
    server.close();
    return;
  }

  if (!code) {
    res.writeHead(400);
    res.end('Missing authorization code');
    return;
  }

  console.log('\n✅ Authorization code received!');
  console.log('🔄 Exchanging code for tokens...\n');

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    console.log('✅ Tokens received!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Add these to your Supabase Edge Function secrets:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('YOUTUBE_CLIENT_ID=' + CLIENT_ID);
    console.log('YOUTUBE_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('YOUTUBE_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 To add secrets to Supabase:');
    console.log('   supabase secrets set YOUTUBE_CLIENT_ID="..."');
    console.log('   supabase secrets set YOUTUBE_CLIENT_SECRET="..."');
    console.log('   supabase secrets set YOUTUBE_REFRESH_TOKEN="..."\n');
    console.log('Or add them in Supabase Dashboard → Edge Functions → Secrets\n');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .success {
              background: #4CAF50;
              color: white;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .code {
              background: #2d2d2d;
              color: #f8f8f2;
              padding: 15px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              overflow-x: auto;
              margin: 10px 0;
            }
            .token {
              word-break: break-all;
              user-select: all;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Authorization Successful!</h1>
            <p>Your YouTube API tokens have been generated.</p>
          </div>

          <h2>📋 Add these secrets to Supabase:</h2>

          <div class="code">
            <div class="token">YOUTUBE_CLIENT_ID=${CLIENT_ID}</div>
            <div class="token">YOUTUBE_CLIENT_SECRET=${CLIENT_SECRET}</div>
            <div class="token">YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}</div>
          </div>

          <p><strong>Check your terminal for full instructions!</strong></p>
          <p>You can close this window now.</p>
        </body>
      </html>
    `);

    server.close();
  } catch (error) {
    console.error('❌ Error exchanging code:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <h1>❌ Error</h1>
          <p>${error.message}</p>
          <p>Check the terminal for details.</p>
        </body>
      </html>
    `);
    server.close();
  }
});

server.listen(PORT, () => {
  // Build authorization URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log(`🌐 Server started on http://localhost:${PORT}`);
  console.log('\n🔓 Opening browser for authorization...\n');
  console.log('If browser doesn\'t open, visit this URL:');
  console.log(authUrl.toString() + '\n');

  // Open browser automatically
  const openCommand = process.platform === 'darwin' ? 'open' :
                     process.platform === 'win32' ? 'start' : 'xdg-open';

  exec(`${openCommand} "${authUrl.toString()}"`, (error) => {
    if (error) {
      console.log('⚠️  Could not open browser automatically.');
      console.log('Please open the URL above manually.\n');
    }
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('Please close any application using this port and try again.');
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});
