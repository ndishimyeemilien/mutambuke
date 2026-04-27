
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
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/landing');
      return;
    }

    // Only redirect once we have a definitive answer on the profile
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
        // Logged in but profile doc not found yet - allow some buffer or redirect to auth to re-init
        const timeout = setTimeout(() => {
          if (!profile) router.push('/auth');
        }, 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [user, authLoading, profile, profileLoading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="relative w-48 h-48 mb-8">
        {logo && (
          <Image 
            src={logo.imageUrl} 
            alt="MUTAMBUKE Logo" 
            fill 
            className="object-contain rounded-[3rem] animate-pulse"
            priority
          />
        )}
      </div>
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
           <div className="w-4 h-4 rounded-full bg-secondary animate-bounce [animation-delay:-0.3s]"></div>
           <div className="w-4 h-4 rounded-full bg-secondary animate-bounce [animation-delay:-0.15s]"></div>
           <div className="w-4 h-4 rounded-full bg-secondary animate-bounce"></div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">MUTAMBUKE</h2>
          <p className="text-secondary font-black italic tracking-widest text-xs uppercase opacity-80">Smart Urban Travel</p>
        </div>
      </div>
    </div>
  );
}
