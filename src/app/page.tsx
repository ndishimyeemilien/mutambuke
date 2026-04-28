
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
    if (authLoading || isRedirecting) return;

    if (!user) {
      setIsRedirecting(true);
      router.replace('/landing');
      return;
    }

    // Wait for profile to load to know where to send the user
    if (profileLoading) return;

    if (profile) {
      setIsRedirecting(true);
      const role = profile.role;
      if (role === 'admin') {
        router.replace('/dashboard/admin');
      } else if (role === 'driver') {
        router.replace('/dashboard/driver');
      } else {
        router.replace('/dashboard/passenger');
      }
    } else if (!profile && !profileLoading && user) {
      // If user exists but profile doesn't, they might be in registration or it's a new user
      if (user.email === 'admin@mutambuke.com') {
         router.replace('/dashboard/admin');
      } else {
         router.replace('/auth');
      }
      setIsRedirecting(true);
    }
  }, [user, authLoading, profile, profileLoading, router, isRedirecting]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full">
        <div className="relative w-32 h-32 animate-pulse">
          {logo && <Image src={logo.imageUrl} alt="MUTAMBUKE" fill className="object-contain rounded-[2.5rem]" priority />}
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
