import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts}",
  ],
  safelist: [
    // Dynamic project badge colors (stored in DB, must survive purge)
    'bg-emerald-500/20', 'text-emerald-400',
    'bg-amber-500/20', 'text-amber-400',
    'bg-blue-500/20', 'text-blue-400',
    'bg-cyan-500/20', 'text-cyan-400',
    'bg-purple-500/20', 'text-purple-400',
    'bg-rose-500/20', 'text-rose-400',
    'bg-red-500/20', 'text-red-400',
    'bg-yellow-500/20', 'text-yellow-400',
    'bg-indigo-500/20', 'text-indigo-400',
    'bg-teal-500/20', 'text-teal-400',
    'bg-gray-500/20', 'text-gray-400',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Host Grotesk', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
        comfortaa: ['var(--font-comfortaa)', 'Comfortaa', 'sans-serif'],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Design token colors — surfaces
        surface: {
          DEFAULT: '#1A1730',
          darker: '#0F0D1A',
          deep: '#141225',
          elevated: '#221F3A',
        },
        'surface-border': {
          DEFAULT: '#2D2A40',
          hover: '#4B4768',
        },
        // Design token colors — text
        content: {
          DEFAULT: '#EEEDF5',
          secondary: '#C8C5D6',
          muted: '#9B97B0',
          faint: '#6B6680',
        },
        // Design token colors — brand accent
        brand: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          lighter: '#A5B4FC',
          dark: '#5558E6',
          darker: '#4F46E5',
        },
        // Section accent — news
        news: {
          DEFAULT: '#88B04B',
          light: '#A5C85A',
          dark: '#6d8c3c',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        fadeOut: {
          from: {
            opacity: "1",
            transform: "scale(1) translateY(0)",
          },
          to: {
            opacity: "0",
            transform: "scale(0.95) translateY(10px)",
          },
        },
        expandCard: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        "slide-right": {
          from: {
            opacity: "0",
            transform: "translateX(-100%)",
          },
          to: {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        float: {
          "0%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-100px) translateX(50px)" },
          "100%": { transform: "translateY(0) translateX(0)" },
        },
      },
      animation: {
        fadeOut: "fadeOut 0.3s ease-out forwards",
        expandCard: "expandCard 0.6s ease-in-out",
        "slide-right": "slide-right 0.5s ease-out forwards",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
  ],
}

export default config
