
'use client';

import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

/**
 * RootPage acts as the main entry point and traffic controller.
 * It redirects users to the appropriate dashboard based on their role
 * or to the landing page if they are not authenticated.
 */
export default function RootPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { data: profile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);
  const redirecting = useRef(false);
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  useEffect(() => {
    // If we're already redirecting or still checking auth, do nothing
    if (authLoading || redirecting.current) return;

    // 1. No user logged in? Go to landing
    if (!user) {
      redirecting.current = true;
      router.replace('/landing');
      return;
    }

    // 2. User exists, wait for profile data
    if (profileLoading) return;

    // 3. Profile found? Go to role-specific dashboard
    if (profile) {
      redirecting.current = true;
      const role = profile.role;
      if (role === 'admin') {
        router.replace('/dashboard/admin');
      } else if (role === 'driver') {
        router.replace('/dashboard/driver');
      } else {
        router.replace('/dashboard/passenger');
      }
      return;
    }

    // 4. User exists but NO profile found in Firestore?
    // This happens for new signups or incomplete registrations.
    // Send to /auth but DON'T loop back here if /auth redirects to /
    if (user && !profile && !profileLoading) {
      redirecting.current = true;
      // Special case for the manual admin account
      if (user.email === 'admin@mutambuke.com') {
        router.replace('/dashboard/admin');
      } else {
        router.replace('/auth');
      }
    }
  }, [user, authLoading, profile, profileLoading, router]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full animate-pulse">
        <div className="relative w-32 h-32">
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
