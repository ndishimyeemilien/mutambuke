'use client';

import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { data: profile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);
  const redirecting = useRef(false);
  
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (!redirecting.current) {
        redirecting.current = true;
        router.replace('/landing');
      }
      return;
    }

    // If profile is loaded, redirect to specific dashboard
    if (!profileLoading && profile) {
      if (!redirecting.current) {
        redirecting.current = true;
        const role = profile.role;
        if (role === 'admin') {
          router.replace('/dashboard/admin');
        } else if (role === 'driver') {
          router.replace('/dashboard/driver');
        } else {
          router.replace('/dashboard/passenger');
        }
      }
      return;
    }

    // Fast fallback if profile takes too long (over 800ms)
    const fastFallback = setTimeout(() => {
      if (user && !redirecting.current && !profile) {
        // If we still don't have profile, try to ensure we are at least logged in properly
        // Defaulting to passenger dashboard for now as it's the primary role
        router.replace('/dashboard/passenger');
      }
    }, 1500);

    return () => clearTimeout(fastFallback);
  }, [user, authLoading, profile, profileLoading, router]);

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full animate-pulse">
        <div className="relative w-24 h-24">
          <Image src="/logo.png" alt="MUTAMBUKE" fill className="object-contain rounded-2xl" priority />
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">
            MUTAMBUKE
          </h2>
          <div className="flex items-center justify-center gap-2 text-secondary font-black uppercase text-[10px]">
            <Loader2 className="size-3 animate-spin" />
            CONNECTING...
          </div>
        </div>
      </div>
    </div>
  );
}
