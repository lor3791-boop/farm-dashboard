/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F4F2EC', ink: '#1D2622', muted: '#56645E', line: '#E2DDD2', line2: '#EFEBE3',
        brand: { DEFAULT: '#1F4E3D', 600: '#2F6B55', 50: '#E6EFE9', 100: '#CFE0D6', ink: '#123328' },
        ok: { bg: '#E1F0E7', fg: '#1E5C3D' }, warn: { bg: '#FBEFD5', fg: '#7A4F00' },
        bad: { bg: '#F8E1D8', fg: '#9A3216' }, info: { bg: '#E4ECF3', fg: '#24486B' }
      },
      fontFamily: { sans: ['"Noto Sans KR"', '"Apple SD Gothic Neo"', '"Malgun Gothic"', 'sans-serif'] }
    }
  },
  plugins: []
};
