import './globals.css';
import ClientLayout from './components/ClientLayout';

export const metadata = {
  title: 'HealthCore',
  description: 'A fitness and wellness dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}