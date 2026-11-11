import './globals.css';

export const metadata = {
  title: {
    default: 'NEW AI — Your intelligent workspace',
    template: '%s · NEW AI',
  },
  description:
    'NEW AI is a premium AI assistant for coding, learning, business ideas, writing, and everyday questions. Powered by Google Gemini.',
  applicationName: 'NEW AI',
  keywords: [
    'NEW AI',
    'AI assistant',
    'Gemini',
    'coding assistant',
    'AI chat',
  ],
  authors: [{ name: 'NEW AI' }],
  openGraph: {
    title: 'NEW AI — Your intelligent workspace',
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
