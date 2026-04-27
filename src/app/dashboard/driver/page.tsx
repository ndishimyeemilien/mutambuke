
'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Bike, 
  LogOut, 
  MapPin, 
  User, 
  Phone, 
  Navigation, 
  Flag, 
  ShieldAlert, 
  Loader2,
  Car
} from 'lucide-react';
import { collection, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';

export default function DriverDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const { data: userProfile } = useDoc(user ? `users/${user.uid}` : null);
  const lang = (userProfile?.language as Language) || 'rw';
  const t = translations[lang];

  const { data: driverProfile, loading: profileLoading } = useDoc(user ? `drivers/${user.uid}` : null);
  const isOnline = driverProfile?.status === 'online';
  const isVerified = driverProfile?.isVerified === true;
  const vehicleType = driverProfile?.vehicleType || 'moto';

  const requestsQuery = useMemo(() => {
    if (!db || !isOnline || !isVerified) return null;
    return query(collection(db, 'rides'), where('status', '==', 'requested'), where('vehicleType', '==', vehicleType));
  }, [db, isOnline, isVerified, vehicleType]);
  const { data: incomingRequests } = useCollection(requestsQuery);

  const activeRideQuery = useMemo(() => {
    if (!db || !user || !isVerified) return null;
    return query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'started'])
    );
  }, [db, user, isVerified]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  async function toggleStatus() {
    if (!db || !user) return;
    const newStatus = isOnline ? 'offline' : 'online';
    updateDoc(doc(db, 'drivers', user.uid), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  }

  async function acceptRide(rideId: string) {
    if (!db || !user) return;
    updateDoc(doc(db, 'rides', rideId), {
      status: 'accepted',
      driverId: user.uid,
      driverPhone: userProfile?.phone || ''
    });
  }

  async function startRide(rideId: string) {
    if (!db) return;
    updateDoc(doc(db, 'rides', rideId), { status: 'started' });
  }

  async function completeRide(rideId: string) {
    if (!db) return;
    updateDoc(doc(db, 'rides', rideId), { status: 'completed' });
  }

  async function handleLogout() {
    if (auth) {
      await signOut(auth);
      router.push('/landing');
    }
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin size-8 text-primary" />
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-xl italic text-primary">
            {vehicleType === 'moto' ? <Bike className="size-6" /> : <Car className="size-6" />}
            MUTAMBUKE
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 font-bold uppercase">
            <LogOut className="size-4 mr-2" /> {t.logout}
          </Button>
        </header>
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-6">
            <div className="size-24 rounded-[2rem] bg-orange-100 flex items-center justify-center text-orange-600 mx-auto">
              <ShieldAlert className="size-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black italic text-slate-900 uppercase">{t.verificationPending}</h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                Your account is currently being reviewed by our team.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-secondary text-white px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 font-black text-xl italic tracking-tighter">
          {vehicleType === 'moto' ? <Bike className="size-7" /> : <Car className="size-7" />}
          {vehicleType.toUpperCase()} CONSOLE
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 ${isOnline ? 'bg-green-500/20 text-white' : 'bg-black/20 text-white/60'}`}>
            <div className={`size-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/80 hover:bg-white/10 rounded-full">
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
          <CardContent className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className={`size-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 ${isOnline ? 'bg-green-100 text-green-600 scale-105' : 'bg-slate-100 text-slate-400'}`}>
                {vehicleType === 'moto' ? <Bike className="size-8" /> : <Car className="size-8" />}
              </div>
              <div>
                <h2 className="text-2xl font-black italic text-slate-900 uppercase leading-none">
                  {isOnline ? t.readyToRide : t.goOnline}
                </h2>
                <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest">
                  {isOnline ? 'Waiting for requests...' : 'Activate to start earning'}
                </p>
              </div>
            </div>
            <Switch checked={isOnline} onCheckedChange={toggleStatus} className="data-[state=checked]:bg-green-500 scale-125" />
          </CardContent>
        </Card>

        {currentRide ? (
          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6">
            <div className="bg-primary p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-full bg-white/20 flex items-center justify-center"><User className="size-7" /></div>
                <div>
                  <p className="font-black text-xl italic leading-none">{currentRide.passengerName}</p>
                  <p className="text-[10px] font-black opacity-70 tracking-widest mt-1 uppercase">{t.passenger}</p>
                </div>
              </div>
              <a href={`tel:${currentRide.passengerPhone}`} className="size-12 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                <Phone className="size-6" />
              </a>
            </div>
            <CardContent className="p-8 space-y-8 bg-white">
              <div className="flex gap-5">
                <div className="flex flex-col items-center gap-1">
                  <div className="size-3 rounded-full bg-primary" />
                  <div className="w-1 flex-1 bg-slate-100" />
                  <div className="size-3 rounded-full bg-secondary" />
                </div>
                <div className="flex-1 space-y-8">
                  <div><p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">PICKUP</p><p className="font-black text-slate-900 text-lg leading-tight">{currentRide.pickupLocation}</p></div>
                  <div><p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">DROP OFF</p><p className="font-black text-slate-900 text-lg leading-tight">{currentRide.destination}</p></div>
                </div>
              </div>
              <Button onClick={() => currentRide.status === 'accepted' ? startRide(currentRide.rideId) : completeRide(currentRide.rideId)} className="w-full h-16 rounded-[1.5rem] bg-primary text-white text-xl font-black italic">
                {currentRide.status === 'accepted' ? t.startTrip : t.completeMission}
              </Button>
            </CardContent>
          </Card>
        ) : isOnline ? (
          <div className="space-y-4">
            <h3 className="text-sm font-black italic text-slate-400 tracking-widest uppercase px-2">LIVE REQUESTS</h3>
            {incomingRequests && incomingRequests.length > 0 ? (
              incomingRequests.map(req => (
                <Card key={req.rideId} className="rounded-[2rem] border-none shadow-lg p-6">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center"><User className="size-6" /></div>
                        <div>
                          <p className="font-black text-lg text-slate-900 leading-none">{req.passengerName}</p>
                        </div>
                      </div>
                   </div>
                   <div className="space-y-3 mb-8">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl"><MapPin className="size-4 text-primary" /><p className="text-sm font-bold text-slate-600 truncate">{req.pickupLocation}</p></div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl"><Flag className="size-4 text-secondary" /><p className="text-sm font-bold text-slate-600 truncate">{req.destination}</p></div>
                   </div>
                   <Button onClick={() => acceptRide(req.rideId)} className="w-full h-14 rounded-2xl bg-primary text-white font-black italic">{t.acceptRide}</Button>
                </Card>
              ))
            ) : (
              <div className="py-20 text-center"><Loader2 className="size-10 text-slate-200 animate-spin mx-auto mb-4" /><p className="text-xl font-black italic text-slate-300 uppercase">Scanning...</p></div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center text-slate-300 font-black italic uppercase text-2xl">{t.offline}</div>
        )}
      </main>
    </div>
  );
}
