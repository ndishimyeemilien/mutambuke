
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, User, LogOut, Loader2, Phone, Navigation, Bike, Car as CarIcon, Star } from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { translations, Language } from '@/lib/translations';
import { toast } from '@/hooks/use-toast';

export default function PassengerDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const { data: userProfile } = useDoc(user ? `users/${user.uid}` : null);
  const lang = (userProfile?.language as Language) || 'rw';
  const t = translations[lang];

  const [pickup, setPickup] = useState('My Location');
  const [destination, setDestination] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [selectedRider, setSelectedRider] = useState<any>(null);

  const mapImage = PlaceHolderImages.find(img => img.id === 'map-preview');
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  const ridersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'drivers'), where('status', '==', 'online'), where('isVerified', '==', true));
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

  const [riderProfile, setRiderProfile] = useState<any>(null);
  useEffect(() => {
    async function fetchRiderProfile() {
      if (currentRide?.driverId && db) {
        const d = await getDoc(doc(db, 'users', currentRide.driverId));
        if (d.exists()) setRiderProfile(d.data());
      }
    }
    fetchRiderProfile();
  }, [currentRide, db]);

  async function handleRequestRide() {
    if (!db || !user || !pickup || !destination) return;
    setIsRequesting(true);
    
    try {
      const rideId = doc(collection(db, 'rides')).id;
      const rideData = {
        rideId,
        passengerId: user.uid,
        passengerName: userProfile?.name || 'Passenger',
        passengerPhone: userProfile?.phone || '',
        pickupLocation: pickup,
        destination: destination,
        status: 'requested',
        vehicleType: selectedRider?.vehicleType || 'moto',
        preferredDriverId: selectedRider?.driverId || null,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'rides', rideId), rideData);
      toast({
        title: t.searching,
        description: "Your request is now live.",
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsRequesting(false);
    }
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
          <div className="relative w-8 h-8">
             {logo && <Image src={logo.imageUrl} alt="Logo" fill className="object-contain" />}
          </div>
          MUTAMBUKE
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full text-slate-400">
            <LogOut className="size-5" />
          </Button>
          <div className="size-10 rounded-2xl bg-slate-100 flex items-center justify-center border-2 border-white overflow-hidden">
            <User className="size-5 text-slate-600" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          {mapImage && (
            <Image src={mapImage.imageUrl} alt="Map" fill className="object-cover opacity-90 scale-110" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/20 rounded-full animate-ping" />
              <div className="bg-primary p-2 rounded-full border-4 border-white shadow-2xl relative z-20">
                <Navigation className="size-6 text-white fill-white rotate-45" />
              </div>
            </div>
          </div>

          {riders?.map((rider, i) => (
            <div 
              key={rider.driverId} 
              onClick={() => setSelectedRider(rider)}
              className="absolute cursor-pointer transition-transform hover:scale-125" 
              style={{ top: `${20 + (i * 15)}%`, left: `${15 + (i * 20)}%` }}
            >
              <div className={`p-2 rounded-2xl shadow-xl border-2 ${selectedRider?.driverId === rider.driverId ? 'bg-secondary border-white' : 'bg-white'}`}>
                {rider.vehicleType === 'moto' ? <Bike className="size-5" /> : <CarIcon className="size-5" />}
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-auto p-4 max-w-lg w-full mx-auto space-y-4">
          {currentRide ? (
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-xl">
              <div className={`${currentRide.status === 'requested' ? 'bg-primary' : 'bg-green-600'} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black opacity-70 tracking-widest uppercase">{currentRide.status}</p>
                    <h3 className="text-2xl font-black italic uppercase leading-tight">
                      {currentRide.status === 'requested' ? t.searching : t.rideConfirmed}
                    </h3>
                  </div>
                  {currentRide.status === 'requested' ? <Loader2 className="size-8 animate-spin" /> : <Star className="size-8 fill-white" />}
                </div>
              </div>
              <CardContent className="p-8 space-y-6">
                 {riderProfile && (
                   <div className="flex items-center justify-between bg-slate-50 p-4 rounded-3xl">
                     <div className="flex items-center gap-4">
                       <div className="size-14 rounded-2xl bg-white flex items-center justify-center text-primary">
                         <User className="size-8" />
                       </div>
                       <div>
                         <p className="font-black text-slate-900 italic text-lg uppercase leading-none">{riderProfile.name}</p>
                         <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{currentRide.vehicleType}</p>
                       </div>
                     </div>
                     <a href={`tel:${riderProfile.phone}`} className="size-14 rounded-2xl bg-green-500 text-white flex items-center justify-center shadow-lg">
                       <Phone className="size-7" />
                     </a>
                   </div>
                 )}
                 <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">{t.pickupAt}</p>
                      <p className="font-bold text-slate-900 text-lg">{currentRide.pickupLocation}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">{t.destination}</p>
                      <p className="font-bold text-slate-900 text-lg">{currentRide.destination}</p>
                    </div>
                 </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-[2.5rem] border-none shadow-2xl p-8 space-y-6 bg-white/95 backdrop-blur-xl">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">PICKUP</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-primary" />
                    <Input placeholder="Location..." className="h-14 pl-12 rounded-2xl bg-slate-100 border-none font-bold" value={pickup} onChange={(e) => setPickup(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">DESTINATION</Label>
                  <div className="relative">
                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-secondary" />
                    <Input placeholder="Where to?" className="h-14 pl-12 rounded-2xl bg-slate-100 border-none font-bold" value={destination} onChange={(e) => setDestination(e.target.value)} />
                  </div>
                </div>
              </div>

              {selectedRider && (
                <div className="p-3 bg-secondary/10 rounded-2xl border border-secondary/20 flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-secondary text-white flex items-center justify-center">
                    {selectedRider.vehicleType === 'moto' ? <Bike className="size-5" /> : <CarIcon className="size-5" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-secondary tracking-widest uppercase">{t.selectRider}</p>
                    <p className="font-bold text-slate-900">Rider ID: {selectedRider.driverId.slice(-6).toUpperCase()}</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleRequestRide} 
                disabled={!destination || isRequesting} 
                className={`w-full h-16 rounded-[1.5rem] text-xl font-black shadow-xl uppercase ${selectedRider ? 'bg-secondary' : 'bg-primary'}`}
              >
                {isRequesting ? <Loader2 className="size-6 animate-spin" /> : t.confirmed}
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
