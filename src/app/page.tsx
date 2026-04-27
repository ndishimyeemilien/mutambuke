
'use client';

import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function RootPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { data: profile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/landing');
    } else if (!authLoading && !profileLoading && profile) {
      if (profile.role === 'admin') {
        router.push('/dashboard/admin');
      } else if (profile.role === 'driver') {
        router.push('/dashboard/driver');
      } else {
        router.push('/dashboard/passenger');
      }
    }
  }, [user, authLoading, profile, profileLoading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0e17] text-white">
      <div className="relative w-64 h-64 mb-8 animate-pulse">
        {logo && (
          <Image 
            src={logo.imageUrl} 
            alt="MUTAMBUKE Logo" 
            fill 
            className="object-contain"
            priority
          />
        )}
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-secondary animate-bounce [animation-delay:-0.3s]"></div>
           <div className="w-2 h-2 rounded-full bg-secondary animate-bounce [animation-delay:-0.15s]"></div>
           <div className="w-2 h-2 rounded-full bg-secondary animate-bounce"></div>
        </div>
        <p className="text-secondary font-black italic tracking-widest text-sm uppercase">Loading Mutambuke...</p>
      </div>
    </div>
  );
}
