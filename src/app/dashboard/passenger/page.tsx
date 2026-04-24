'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Bike, User, LogOut, Loader2, Clock, Search, ShieldCheck } from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function PassengerDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const [pickup, setPickup] = useState('Current Location');
  const [destination, setDestination] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const mapImage = PlaceHolderImages.find(img => img.id === 'map-preview');

  // Get online riders
  const ridersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'drivers'), where('status', '==', 'online'));
  }, [db]);
  const { data: riders } = useCollection(ridersQuery);

  // Check for active ride
  const activeRideQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', 'in', ['requested', 'accepted', 'started'])
    );
  }, [db, user]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  async function handleRequestRide() {
    if (!db || !user || !pickup || !destination) return;
    setIsRequesting(true);
    
    const rideId = doc(collection(db, 'rides')).id;
    const rideData = {
      rideId,
      passengerId: user.uid,
      passengerName: user.displayName || user.email?.split('@')[0] || 'Passenger',
      pickupLocation: pickup,
      destination: destination,
      status: 'requested',
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'rides', rideId), rideData);
    setIsRequesting(false);
  }

  async function handleLogout() {
    if (auth) {
      await signOut(auth);
      router.push('/landing');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* App Header */}
      <header className="bg-white border-b px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 font-black text-xl text-primary italic">
          <Bike className="size-6" />
          MUTAMBUKE
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full text-slate-400 hover:text-red-500">
            <LogOut className="size-5" />
          </Button>
          <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="size-4 text-slate-600" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative">
        {/* Full Screen Map Simulation */}
        <div className="absolute inset-0 z-0">
          {mapImage && (
            <Image 
              src={mapImage.imageUrl} 
              alt="Map Background" 
              fill 
              className="object-cover opacity-90 grayscale-[0.2]" 
            />
          )}
          
          {/* Simulated Markers */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 animate-ping rounded-full" />
              <div className="relative size-10 rounded-full bg-primary border-4 border-white flex items-center justify-center text-white shadow-xl">
                <Navigation className="size-5 fill-current" />
              </div>
            </div>
          </div>

          {/* Simulated Riders */}
          {riders?.map((rider, i) => (
            <div key={rider.driverId} className="absolute animate-pulse z-10 transition-all duration-[3000ms]" style={{ top: `${30 + (i * 10)}%`, left: `${20 + (i * 25)}%` }}>
              <div className="bg-white p-2 rounded-full shadow-lg border border-slate-100">
                <Bike className="size-6 text-secondary" />
              </div>
            </div>
          ))}
        </div>

        {/* Floating Content */}
        <div className="relative z-10 mt-auto p-4 max-w-lg w-full mx-auto space-y-4">
          
          {/* Current Trip Overlay */}
          {currentRide ? (
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
              <div className="bg-primary p-6 text-white text-center">
                <div className="flex justify-center mb-2">
                  <Loader2 className="size-8 animate-spin" />
                </div>
                <h3 className="text-2xl font-black italic">SEARCHING FOR RIDER...</h3>
                <p className="opacity-80 font-bold text-xs tracking-widest mt-1">ESTIMATED PICKUP: 4 MIN</p>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="size-3 rounded-full bg-primary" />
                    <div className="w-0.5 flex-1 bg-slate-100" />
                    <div className="size-3 rounded-full bg-secondary" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">PICKUP</p>
                      <p className="font-bold text-slate-900">{currentRide.pickupLocation}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">DESTINATION</p>
                      <p className="font-bold text-slate-900">{currentRide.destination}</p>
                    </div>
                  </div>
                </div>

                {currentRide.status === 'accepted' && (
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-3xl border border-green-100">
                    <div className="size-12 rounded-2xl bg-green-600 flex items-center justify-center text-white">
                      <Bike className="size-6" />
                    </div>
                    <div>
                      <p className="font-black text-green-900">RIDER ACCEPTED</p>
                      <p className="text-xs text-green-700 font-bold">He is 0.8km away from you.</p>
                    </div>
                  </div>
                )}
                
                <Button variant="outline" className="w-full h-14 rounded-2xl border-2 text-slate-400 font-black hover:text-red-500 hover:border-red-100">
                  CANCEL REQUEST
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Nearby Info */}
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-sm border border-white flex items-center gap-3 animate-in fade-in duration-1000">
                <div className="size-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <Bike className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-black italic">{riders?.length || 0} RIDERS NEARBY</p>
                  <p className="text-xs text-slate-500">Fastest pickup around 3 min</p>
                </div>
              </div>

              {/* Request Card */}
              <Card className="rounded-[2.5rem] border-none shadow-2xl p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 tracking-widest">PICKUP POINT</Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 size-2 rounded-full bg-primary" />
                      <Input 
                        placeholder="Current Location" 
                        className="pl-10 h-14 rounded-2xl bg-slate-50 border-none font-bold text-slate-900" 
                        value={pickup}
                        onChange={(e) => setPickup(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 tracking-widest">WHERE ARE YOU GOING?</Label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input 
                        placeholder="Search destination..." 
                        className="pl-12 h-14 rounded-2xl bg-slate-50 border-none font-bold text-slate-900" 
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleRequestRide}
                  disabled={!destination || isRequesting}
                  className="w-full h-16 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white text-xl font-black shadow-xl shadow-primary/20 transition-transform active:scale-95"
                >
                  {isRequesting ? <Loader2 className="size-6 animate-spin" /> : 'CONFIRM RIDE'}
                </Button>

                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-300">
                    <ShieldCheck className="size-3" /> VERIFIED RIDERS
                  </div>
                  <div className="size-1 rounded-full bg-slate-200" />
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-300">
                    <Clock className="size-3" /> 24/7 SERVICE
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
