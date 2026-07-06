/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0E0F13',
          surface: '#171922',
          card: '#222633',
          border: '#2E3342',
          text: '#F4F5F9',
          muted: '#9AA1B2',
          accent: '#7C5CFF',
          accentDown: '#5B4BD6',
          record: '#FF4D5E',
          success: '#34D399',
          warning: '#FBBF24',
        },
        track: {
          1: '#FF6B6B',
          2: '#FFA94D',
          3: '#FFD43B',
          4: '#69DB7C',
          5: '#38D9A9',
          6: '#4DABF7',
          7: '#9775FA',
          8: '#F783AC',
        },
      },
      borderRadius: {
        studio: '8px',
        panel: '12px',
        sheet: '16px',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        micro: ['12px', '16px'],
        body: ['14px', '20px'],
        ui: ['16px', '22px'],
        title: ['20px', '26px'],
        display: ['24px', '30px'],
      },
      boxShadow: {
        led: '0 0 18px rgba(124, 92, 255, 0.42)',
        record: '0 0 18px rgba(255, 77, 94, 0.42)',
      },
    },
  },
  plugins: [],
};
