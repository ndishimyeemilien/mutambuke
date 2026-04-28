'use client';

import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

/**
 * RootPage acts as the primary traffic controller.
 * It detects the user's role and routes them to the correct dashboard.
 */
export default function RootPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  
  // Only fetch profile if user is authenticated
  const { data: profile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);

  useEffect(() => {
    // 1. Wait for Firebase Auth to initialize
    if (authLoading) return;

    // 2. No user? Send to landing page
    if (!user) {
      router.replace('/landing');
      return;
    }

    // 3. User exists? Wait for their Firestore profile to load
    if (!profileLoading) {
      if (profile) {
        // Route based on role
        if (profile.role === 'admin') {
          router.replace('/dashboard/admin');
        } else if (profile.role === 'driver') {
          router.replace('/dashboard/driver');
        } else {
          router.replace('/dashboard/passenger');
        }
      } else {
        // If user exists but no profile found, they might be in the middle of registration
        // or a slow write. We wait here. Only redirect to auth if truly stuck.
        const timeout = setTimeout(() => {
          if (!profile) router.replace('/auth');
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [user, authLoading, profile, profileLoading, router]);

  // Premium minimal splash while deciding route
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
        {logo && (
          <div className="relative w-24 h-24">
            <Image 
              src={logo.imageUrl} 
              alt="Logo" 
              fill 
              className="object-contain rounded-3xl"
              priority 
            />
          </div>
        )}
        <div className="flex items-center gap-2">
           <div className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
           <div className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
           <div className="size-2 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    </div>
  );
}
