'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getAuthSafe } from '../../firebase.config';

export default function RoleLinks() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDriver, setShowDriver] = useState(false);

  useEffect(() => {
    // Detect anonymous driver session
    const auth = getAuthSafe();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setShowDriver(Boolean(u?.isAnonymous));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Check admin cookie via API
    (async () => {
      try {
        const res = await fetch('/api/admin-auth', { credentials: 'include' });
        if (!res.ok) { setShowAdmin(false); return; }
        const data = await res.json().catch(() => ({} as any));
        // Show admin ONLY if endpoint explicitly returns authorized: true
        setShowAdmin(Boolean((data as any)?.authorized === true));
      } catch {
        setShowAdmin(false);
      }
    })();
  }, []);

  if (!showAdmin && !showDriver) return null;

  return (
    <>
      {showDriver && <Link href="/forare" className="hover:text-white">Förare</Link>}
      {showAdmin && <Link href="/admin" className="hover:text-white">Admin</Link>}
    </>
  );
}
