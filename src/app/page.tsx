'use client';

import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function RootPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { data: profile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);

  useEffect(() => {
    // Wait until both Auth and Profile (if user exists) are finished loading
    if (authLoading) return;

    if (!user) {
      router.replace('/landing');
      return;
    }

    // If we have a user, wait for the profile to load
    if (!profileLoading) {
      if (profile) {
        if (profile.role === 'admin') {
          router.replace('/dashboard/admin');
        } else if (profile.role === 'driver') {
          router.replace('/dashboard/driver');
        } else {
          router.replace('/dashboard/passenger');
        }
      } else {
        // User is logged in but has no profile record yet (possible during registration)
        // We stay here or push to auth to complete if truly missing
        // Using replace to prevent back-button loops
        const checkMissing = setTimeout(() => {
          if (!profile) router.replace('/auth');
        }, 2000);
        return () => clearTimeout(checkMissing);
      }
    }
  }, [user, authLoading, profile, profileLoading, router]);

  // Premium minimal splash while deciding route
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {logo && (
        <div className="relative w-24 h-24 animate-pulse">
          <Image 
            src={logo.imageUrl} 
            alt="Logo" 
            fill 
            className="object-contain rounded-3xl"
            priority 
          />
        </div>
      )}
    </div>
  );
}
