
'use client';

import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { data: profile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/landing');
    } else if (!authLoading && !profileLoading && profile) {
      if (profile.role === 'driver') {
        router.push('/dashboard/driver');
      } else {
        router.push('/dashboard/passenger');
      }
    }
  }, [user, authLoading, profile, profileLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="size-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground animate-pulse">Initializing MUTAMBUKE...</p>
      </div>
    </div>
  );
}
