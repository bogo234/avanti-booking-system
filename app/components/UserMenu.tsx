'use client';

import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getAuthSafe } from '../../firebase.config';
import { useRouter } from 'next/navigation';

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && !u.isAnonymous) setUser(u); else setUser(null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  if (!user) return null;

  const initial = (user.displayName || user.email || 'A').trim().charAt(0).toUpperCase();

  const handleLogout = async () => {
    try { const auth = getAuthSafe(); if (auth) await signOut(auth); } catch {}
    setOpen(false);
    router.replace('/login');
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 ring-1 ring-white/10 text-white hover:bg-white/15"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Konto"
      >
        <span className="text-sm font-semibold">{initial}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-black/80 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl p-1 z-[100]">
          <div className="px-3 py-2 text-[11px] text-zinc-400 truncate">
            {user.email || 'Inloggad'}
          </div>
          <div className="h-px bg-white/10 my-1" />
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-xl"
          >
            Logga ut
          </button>
        </div>
      )}
    </div>
  );
}
