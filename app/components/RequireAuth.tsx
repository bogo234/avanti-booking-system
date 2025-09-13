'use client';

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { usePathname, useRouter } from 'next/navigation';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    // Tillåt auth och legala sidor utan redirect
    if (pathname && (pathname.startsWith('/auth') || pathname.startsWith('/villkor') || pathname.startsWith('/integritet'))) {
      setUser(null);
      return;
    }
    if (!auth) { setUser(null); return; }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        const next = encodeURIComponent(pathname || '/');
        router.replace(`/auth?next=${next}`);
      }
    });
    return () => unsub();
  }, [router, pathname]);

  if (user === undefined) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-zinc-400 text-sm">
        Kontrollerar inloggning…
      </div>
    );
  }

  return <>{children}</>;
}
