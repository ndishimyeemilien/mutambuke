'use client';

import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RootPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { data: profile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/landing');
      return;
    }

    if (!profileLoading) {
      if (profile) {
        if (profile.role === 'admin') {
          router.push('/dashboard/admin');
        } else if (profile.role === 'driver') {
          router.push('/dashboard/driver');
        } else {
          router.push('/dashboard/passenger');
        }
      } else {
        // Fallback for new users or missing profiles to prevent hang
        const timeout = setTimeout(() => {
          if (!profile) router.push('/auth');
        }, 1000);
        return () => clearTimeout(timeout);
      }
    }
  }, [user, authLoading, profile, profileLoading, router]);

  // Minimal blank state while redirecting to ensure "immediate" feel
  return <div className="min-h-screen bg-white" />;
}
