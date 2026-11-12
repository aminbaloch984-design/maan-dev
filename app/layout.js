import './globals.css';

export const metadata = {
  title: {
    default: 'NEW AI — Mohammed Nabeel’s personal AI',
    template: '%s · NEW AI',
  },
  description:
    'NEW AI is the personal AI assistant of Mohammed Nabeel — built for coding, learning, web development, Android apps and everyday questions. Powered by Google Gemini.',
  applicationName: 'NEW AI',
  keywords: [
    'NEW AI',
    'Mohammed Nabeel',
    'AI assistant',
    'Gemini',
    'coding assistant',
    'AI chat',
  ],
  authors: [{ name: 'Mohammed Nabeel' }],
  openGraph: {
    title: 'NEW AI — Mohammed Nabeel’s personal AI',
    description:
      'Think faster, build smarter, and learn anything with NEW AI.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08090d' },
    { media: '(prefers-color-scheme: light)', color: '#f5f5f9' },
  ],
};

const themeScript = `
  (function () {
    try {
      var stored = localStorage.getItem('new-ai-theme');
      var theme = stored === 'light' || stored === 'dark'
        ? stored
        : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = 'dark';
    }
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
