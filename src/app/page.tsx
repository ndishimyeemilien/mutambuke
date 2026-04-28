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
  const [redirecting, setRedirecting] = useState(false);
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  useEffect(() => {
    // Wait for auth to initialize
    if (authLoading) return;

    // If not authenticated, go to landing immediately
    if (!user) {
      router.replace('/landing');
      return;
    }

    // If authenticated, wait for profile data to determine role
    if (!profileLoading && !redirecting) {
      if (profile) {
        setRedirecting(true);
        if (profile.role === 'admin') {
          router.replace('/dashboard/admin');
        } else if (profile.role === 'driver') {
          router.replace('/dashboard/driver');
        } else {
          router.replace('/dashboard/passenger');
        }
      } else {
        // Handle case where user exists but profile is still creating/missing
        const timeout = setTimeout(() => {
          if (!profile && !profileLoading) router.replace('/auth');
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [user, authLoading, profile, profileLoading, router, redirecting]);

  // Show a stable, branded loading state to prevent flickering
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
        <div className="relative w-32 h-32 animate-bounce">
          {logo && <Image src={logo.imageUrl} alt="MUTAMBUKE" fill className="object-contain" />}
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">MUTAMBUKE</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">Initializing Smart Network...</p>
        </div>
      </div>
    </div>
  );
}