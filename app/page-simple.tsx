"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function HomeSimple() {
  return (
    <div className="relative min-h-screen">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,#0b0b0b,transparent_40%),radial-gradient(circle_at_70%_30%,#101010,transparent_40%),linear-gradient(#000,#0a0a0a)]" />
      <div className="absolute inset-0 -z-10 pointer-events-none bg-gradient-to-b from-black/70 via-black/50 to-black" />

      {/* Top bar */}
      <div className="topbar fixed top-0 left-0 right-0 p-4 flex items-center justify-between z-30 relative">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/avanti-logo.svg" alt="Avanti" width={120} height={36} priority />
        </Link>
        <div className="hidden md:flex items-center gap-4 text-sm text-zinc-300">
          <Link href="/tjanster" className="hover:text-white">Tjänster</Link>
          <Link href="/villkor" className="hover:text-white">Villkor</Link>
          <Link href="/om-oss" className="hover:text-white">Om oss</Link>
          <Link href="/sa-funkar-det" className="hover:text-white">Så funkar det</Link>
          <Link href="/kontakt" className="hover:text-white">Kontakt</Link>
          <Link href="/admin" className="hover:text-white">Förare/Admin</Link>
        </div>
      </div>

      {/* HERO section */}
      <section className="relative min-h-screen flex items-center justify-center p-4 z-10">
        <div className="absolute inset-0 -z-20" style={{
          backgroundImage: "url('/avanti-logo.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} />
        <div className="absolute inset-0 -z-10 pointer-events-none bg-black/40" />
        <div className="w-full max-w-3xl text-center space-y-6 animate-fade-up">
          <h1 className="text-3xl md:text-5xl font-semibold text-white">Vi kör dig och din bil hem – med klass</h1>
          <div className="booking-card p-4 md:p-5 space-y-2 text-left">
            <div className="flex gap-2">
              <input
                className="input-card p-2.5 flex-1 text-sm"
                placeholder="Upphämtningsadress"
              />
              <button className="btn-primary btn-sm whitespace-nowrap">Min plats</button>
            </div>
            <input
              className="input-card p-2.5 w-full text-sm"
              placeholder="Slutadress"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                className="input-card p-2.5 w-full text-sm"
                type="datetime-local"
              />
              <button className="btn-primary btn-sm w-full">
                Fortsätt till bokning
              </button>
            </div>
            <p className="text-xs text-zinc-400">Priser: från 500 kr + 30 kr per km.</p>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="px-4 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="font-semibold text-white">Professionella förare</p>
            <p className="text-sm text-zinc-300">Noggrant utvalda och bakgrundskontrollerade.</p>
          </div>
          <div className="card p-4">
            <p className="font-semibold text-white">BankID-verifiering</p>
            <p className="text-sm text-zinc-300">Säker legitimering för både kund och förare.</p>
          </div>
          <div className="card p-4">
            <p className="font-semibold text-white">Realtidsspårning</p>
            <p className="text-sm text-zinc-300">Följ resan live i appen från start till mål.</p>
          </div>
          <div className="card p-4">
            <p className="font-semibold text-white">Premium & diskret</p>
            <p className="text-sm text-zinc-300">Lyxig upplevelse med full diskretion.</p>
          </div>
        </div>
      </section>
    </div>
  );
}




