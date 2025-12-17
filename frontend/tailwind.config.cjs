/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'royal-orange': '#E07A24',
        'copper': '#A3562A',
        'heritage': '#7A3B23',
        'matte-brown': '#B46D3C',
        'warm-sand': '#F4E6D8',
        'ivory-smoke': '#EFE9E2',
        // Legacy aliases for backward compatibility
        'emperor': '#7A3B23',
        'tuscan': '#B46D3C',
        'gold': '#E07A24',
        'ivory': '#F4E6D8',
        'prestige': '#0F0C0A',
      },
      fontFamily: {
        'royal': ['Cormorant Garamond', 'serif'],
        'playfair': ['Playfair Display', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      },
      // Enhanced responsive breakpoints
      screens: {
        'xs': '375px',    // Small phones
        'sm': '640px',    // Large phones
        'md': '768px',    // Tablets
        'lg': '1024px',   // Small desktops/laptops
        'xl': '1280px',   // Desktops
        '2xl': '1536px',  // Large desktops
        '3xl': '1920px',  // TVs/4K monitors
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      animation: {
        'gradient-move': 'gradientMove 15s ease infinite',
        'float-slow': 'floatSlow 20s ease-in-out infinite',
        'float-medium': 'floatMedium 15s ease-in-out infinite',
        'float-fast': 'floatFast 10s ease-in-out infinite',
        'float-reverse': 'floatReverse 18s ease-in-out infinite',
        'float-diagonal': 'floatDiagonal 25s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.6s ease-out forwards',
        'slideInRight': 'slideInRight 0.5s ease-out forwards',
        'scaleIn': 'scaleIn 0.4s ease-out forwards',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        gradientMove: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -30px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
        floatMedium: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '50%': { transform: 'translate(-40px, -40px) rotate(180deg)' },
        },
        floatFast: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(20px, 20px)' },
          '50%': { transform: 'translate(-20px, 30px)' },
          '75%': { transform: 'translate(30px, -20px)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(50px, 50px) scale(1.2)' },
        },
        floatDiagonal: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(-50px, 40px)' },
          '50%': { transform: 'translate(40px, -50px)' },
          '75%': { transform: 'translate(-30px, -40px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      backgroundSize: {
        '200': '200%',
      },
      backgroundPosition: {
        'pos-0': '0% 0%',
        'pos-100': '100% 100%',
      },
    },
  },
  plugins: [],
}
