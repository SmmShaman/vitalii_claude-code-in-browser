import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Host Grotesk', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
        comfortaa: ['Comfortaa', 'sans-serif'],
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
