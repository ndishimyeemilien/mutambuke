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
    // 1. Wait for Firebase Auth to determine if a user exists
    if (authLoading) return;

    // 2. If no user, go to landing immediately
    if (!user) {
      if (!isRedirecting) {
        setIsRedirecting(true);
        router.replace('/landing');
      }
      return;
    }

    // 3. If user exists, wait for the Firestore profile to load
    if (profileLoading) return;

    // 4. Once profile is available, route to the correct dashboard
    if (profile && !isRedirecting) {
      setIsRedirecting(true);
      const role = profile.role;
      if (role === 'admin') {
        router.replace('/dashboard/admin');
      } else if (role === 'driver') {
        router.replace('/dashboard/driver');
      } else {
        router.replace('/dashboard/passenger');
      }
    } else if (!profile && !profileLoading && !isRedirecting) {
      // If user exists but no profile is found after loading, go to auth
      setIsRedirecting(true);
      router.replace('/auth');
    }
  }, [user, authLoading, profile, profileLoading, router, isRedirecting]);

  // Branded "Join the Movement" loading state
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full">
        <div className="relative w-32 h-32 animate-pulse">
          {logo && <Image src={logo.imageUrl} alt="MUTAMBUKE" fill className="object-contain rounded-[2.5rem]" />}
        </div>
        <div className="space-y-3 text-center">
          <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
            MUTAMBUKE
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">
            SMART URBAN NETWORK
          </p>
        </div>
      </div>
    </div>
  );
}
