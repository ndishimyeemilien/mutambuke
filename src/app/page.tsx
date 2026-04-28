
'use client';

import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * RootPage acts as the primary traffic controller.
 * Optimized for speed by removing all visual loading elements.
 */
export default function RootPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { data: profile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/landing');
      return;
    }

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
        // Fallback for missing profile
        const timeout = setTimeout(() => {
          if (!profile) router.replace('/auth');
        }, 1000);
        return () => clearTimeout(timeout);
      }
    }
  }, [user, authLoading, profile, profileLoading, router]);

  return null; // Silent redirection
}
