# Vitalii Berbeha - Portfolio Website

A modern, animated portfolio website built with React, TypeScript, and Bento Grid design style.

## Features

- **Bento Grid Layout**: Modern card-based layout with 6 sections
- **3D Particle Animation**: Interactive Three.js background with mouse interaction
- **Multi-language Support**: English, Norwegian, and Ukrainian
- **Smooth Animations**: Framer Motion and CSS keyframes
- **Contact Form**: Integrated with Supabase
- **Responsive Design**: Mobile, tablet, and desktop optimized
- **SEO Optimized**: Meta tags and semantic HTML

## Tech Stack

### Frontend
- **React 18.3+** with TypeScript
- **Vite** as build tool
- **TailwindCSS 3.4+** for styling
- **Framer Motion** for UI animations
- **Three.js** for 3D particle effects
- **React Router DOM** for routing

### UI Components
- **Radix UI** for accessible components
- **Lucide React** for icons
- **React Hook Form** with Zod validation

### Backend
- **Supabase** for contact form data storage

## Project Structure

```
src/
├── components/
│   ├── background/
│   │   └── ParticlesBackground.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── sections/
│       ├── BentoGrid.tsx
│       ├── SectionDialog.tsx
│       └── ContactForm.tsx
├── hooks/
│   └── useTranslations.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── lib/
│   └── utils.ts
├── pages/
│   └── Index.tsx
├── utils/
│   └── translations.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vitalii_claude-code-in-browser
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup

Create a table in your Supabase project:

```sql
create table contact_forms (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text not null,
  message text not null
);

-- Enable Row Level Security
alter table contact_forms enable row level security;

-- Create a policy for inserting
create policy "Enable insert for all users" on contact_forms
  for insert with check (true);
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Deployment

### Automatic Deployment with Netlify

This project is configured for automatic deployment to Netlify with GitHub integration.

**📖 See detailed instructions in [DEPLOYMENT.md](./DEPLOYMENT.md)**

Quick start:
1. Push code to GitHub
2. Connect GitHub repository to Netlify
3. Netlify automatically deploys on every push
4. Add your custom domain when ready

The project includes:
- ✅ `netlify.toml` - Pre-configured build settings
- ✅ Redirects for SPA routing
- ✅ Performance optimizations
- ✅ Security headers

## Sections

### 1. About Me
Professional background and personal philosophy in e-commerce and marketing.

### 2. Projects
Latest work and achievements in e-commerce solutions and marketing campaigns.

### 3. Services
Comprehensive list of services including:
- E-commerce strategy development
- Amazon/Etsy/eBay store setup
- Brand management via SMM
- Marketing consulting
- Targeted advertising

### 4. Skills
Technologies and competencies including e-commerce platforms, marketing tools, and project management.

### 5. Testimonials
Client feedback and success stories.

### 6. Contact
Contact form with validation for direct communication.

## Features Highlights

### Animations
- **Snake Expansion**: Cards animate smoothly when clicked
- **Particle System**: 1000 interactive particles with mouse tracking
- **Smooth Transitions**: All UI elements have fluid animations
- **Responsive Hover Effects**: Visual feedback on all interactive elements

### Internationalization
Switch between:
- **EN** - English
- **NO** - Norwegian (Norsk)
- **UA** - Ukrainian (Українська)

### Layout
- **Header**: 22.2vh fixed at top
- **Main Content**: 66.7vh scrollable
- **Footer**: 11.1vh fixed at bottom

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

WebGL fallback provided for older browsers.

## Performance

- Code splitting with React.lazy
- Optimized Three.js particle count
- Image lazy loading
- CSS animations with will-change
- Minimized JavaScript bundle

## License

All rights reserved.

## Contact

**Vitalii Berbeha**
- Twitter: [@vitalii](https://twitter.com)
- LinkedIn: [Vitalii Berbeha](https://linkedin.com)
- Email: contact@example.com
