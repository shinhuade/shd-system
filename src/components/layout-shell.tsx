'use client';

import { usePathname } from 'next/navigation';
import Header from './header';
import Footer from './footer';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showLayout = !pathname.startsWith('/admin') && !pathname.startsWith('/docs');
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    router.replace('/admin');
  }, [router, pathname]);

  return (
    <>
      {showLayout && <Header />}
      {children}
      {showLayout && <Footer />}
    </>
  );
}
