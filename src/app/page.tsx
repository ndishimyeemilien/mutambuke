'use client';

import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * RootPage acts as the primary traffic controller.
 * It ensures the user is correctly routed based on their authentication status and role.
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

    // Wait for profile to load before making a redirection decision
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
        // If user is authenticated but no profile exists, they likely need to complete registration or something went wrong
        // We give it a small grace period before forcing them to auth
        const timeout = setTimeout(() => {
          if (!profile) router.replace('/auth');
        }, 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [user, authLoading, profile, profileLoading, router]);

  // We return null to avoid any flickering or unwanted UI before redirection
  return null;
}
