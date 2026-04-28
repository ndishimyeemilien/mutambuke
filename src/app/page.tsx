
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
    if (authLoading || redirecting.current) return;

    if (!user) {
      redirecting.current = true;
      router.replace('/landing');
      return;
    }

    if (profileLoading) return;

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
    } else {
      // If user exists but profile doesn't load after auth, check if it's first time
      // We wait a bit or redirect to auth to complete profile
      if (!profileLoading) {
        redirecting.current = true;
        router.replace('/auth');
      }
    }
  }, [user, authLoading, profile, profileLoading, router]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full">
        <div className="relative w-32 h-32">
          {logo && <Image src={logo.imageUrl} alt="MUTAMBUKE" fill className="object-contain rounded-[2.5rem]" priority />}
        </div>
        <div className="space-y-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
              MUTAMBUKE
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">
              SMART URBAN NETWORK
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-primary font-black italic uppercase text-xs">
            <Loader2 className="size-4 animate-spin" />
            Synchronizing...
          </div>
        </div>
      </div>
    </div>
  );
}
