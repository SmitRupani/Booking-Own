import type { Metadata } from "next";
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Toaster } from '@/components/ui/Toaster';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'SST Booking (Rewrite)',
  description: 'Rewritten booking UI scaffold',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
