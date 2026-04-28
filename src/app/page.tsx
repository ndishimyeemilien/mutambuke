'use client';

import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function RootPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { data: profile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  useEffect(() => {
    // Wait for auth state to initialize
    if (authLoading) return;

    // If not logged in, go to landing page
    if (!user) {
      router.replace('/landing');
      return;
    }

    // If logged in, wait for profile to determine the correct dashboard
    if (!profileLoading && profile && !isRedirecting) {
      setIsRedirecting(true);
      if (profile.role === 'admin') {
        router.replace('/dashboard/admin');
      } else if (profile.role === 'driver') {
        router.replace('/dashboard/driver');
      } else {
        router.replace('/dashboard/passenger');
      }
    } else if (!profileLoading && !profile && !isRedirecting) {
      // If user exists but no profile, send to auth to finish setup or re-login
      const timeout = setTimeout(() => {
        if (!profile) router.replace('/auth');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [user, authLoading, profile, profileLoading, router, isRedirecting]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
        <div className="relative w-32 h-32 animate-bounce">
          {logo && <Image src={logo.imageUrl} alt="MUTAMBUKE" fill className="object-contain" />}
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 uppercase">MUTAMBUKE</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">Stay Connected. Stay Moving.</p>
        </div>
      </div>
    </div>
  );
}
