
'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Bike, User, LogOut, Loader2, Clock, Search, ShieldCheck, Car } from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { translations, Language } from '@/lib/translations';

export default function PassengerDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const { data: userProfile } = useDoc(user ? `users/${user.uid}` : null);
  const lang = (userProfile?.language as Language) || 'rw';
  const t = translations[lang];

  const [pickup, setPickup] = useState('Current Location');
  const [destination, setDestination] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const mapImage = PlaceHolderImages.find(img => img.id === 'map-preview');

  const ridersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'drivers'), where('status', '==', 'online'));
  }, [db]);
  const { data: riders } = useCollection(ridersQuery);

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
      passengerName: userProfile?.name || user.email?.split('@')[0] || 'Passenger',
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
        <div className="absolute inset-0 z-0">
          {mapImage && (
            <Image src={mapImage.imageUrl} alt="Map" fill className="object-cover opacity-90" />
          )}
          {riders?.map((rider, i) => (
            <div key={rider.driverId} className="absolute animate-pulse" style={{ top: `${30 + (i * 10)}%`, left: `${20 + (i * 25)}%` }}>
              <div className="bg-white p-2 rounded-full shadow-lg border">
                {rider.vehicleType === 'taxi' ? <Car className="size-6 text-secondary" /> : <Bike className="size-6 text-secondary" />}
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-auto p-4 max-w-lg w-full mx-auto space-y-4">
          {currentRide ? (
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
              <div className="bg-primary p-6 text-white text-center">
                <Loader2 className="size-8 animate-spin mx-auto mb-2" />
                <h3 className="text-2xl font-black italic uppercase">{t.searching}</h3>
              </div>
              <CardContent className="p-8 space-y-6">
                 <div className="flex gap-4">
                    <div className="flex-1 space-y-6">
                      <div><p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">PICKUP</p><p className="font-bold text-slate-900">{currentRide.pickupLocation}</p></div>
                      <div><p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">DESTINATION</p><p className="font-bold text-slate-900">{currentRide.destination}</p></div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-sm border flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary"><Bike className="size-5" /></div>
                <div><p className="text-sm font-black italic uppercase">{riders?.length || 0} {t.nearbyRiders}</p></div>
              </div>

              <Card className="rounded-[2.5rem] border-none shadow-2xl p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">PICKUP POINT</Label>
                    <Input placeholder="Current Location" className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={pickup} onChange={(e) => setPickup(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">WHERE TO?</Label>
                    <Input placeholder="Destination..." className="h-14 rounded-2xl bg-slate-50 border-none font-bold" value={destination} onChange={(e) => setDestination(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleRequestRide} disabled={!destination || isRequesting} className="w-full h-16 rounded-[1.5rem] bg-primary text-white text-xl font-black shadow-xl">
                  {isRequesting ? <Loader2 className="size-6 animate-spin" /> : t.confirmed}
                </Button>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
