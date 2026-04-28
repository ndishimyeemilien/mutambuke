'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Bike, 
  Car, 
  LogOut, 
  Navigation, 
  User, 
  Phone, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  Star,
  Loader2,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { collection, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const containerStyle = { width: "100%", height: "100vh" };
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function DriverDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const [location, setLocation] = useState(kigaliCenter);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const { data: profile, loading: pLoading } = useDoc(user ? `users/${user.uid}` : null);
  const { data: driver, loading: dLoading } = useDoc(user ? `drivers/${user.uid}` : null);

  const lang = (profile?.language as Language) || 'rw';
  const t = translations[lang];

  const status = driver?.status || 'offline';
  const isOnline = status === 'online';
  const isBusy = status === 'busy';
  const isApproved = driver?.verificationStatus === 'approved';
  const vehicleType = driver?.vehicleType || 'moto';

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !isOnline || !isApproved) return null;
    return query(collection(db, 'rides'), where('status', '==', 'requested'), where('vehicleType', '==', vehicleType));
  }, [db, isOnline, isApproved, vehicleType]);
  const { data: requests } = useCollection(requestsQuery);

  const activeQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'rides'), where('driverId', '==', user.uid), where('status', 'in', ['accepted', 'started']));
  }, [db, user]);
  const { data: activeRides } = useCollection(activeQuery);
  const currentRide = activeRides?.[0];

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          if (db && user && (isOnline || isBusy)) {
            updateDoc(doc(db, 'drivers', user.uid), { currentLocation: newLoc, updatedAt: serverTimestamp() });
          }
        },
        null, { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [db, user, isOnline, isBusy]);

  async function toggleStatus() {
    if (!db || !user || !isApproved || isBusy) return;
    await updateDoc(doc(db, 'drivers', user.uid), { status: isOnline ? 'offline' : 'online', updatedAt: serverTimestamp() });
  }

  async function acceptRide(rideId: string) {
    if (!db || !user) return;
    await updateDoc(doc(db, 'rides', rideId), { status: 'accepted', driverId: user.uid, driverName: profile?.name, driverPhone: profile?.phone });
    await updateDoc(doc(db, 'drivers', user.uid), { status: 'busy', updatedAt: serverTimestamp() });
  }

  if (pLoading || dLoading) return <div className="h-screen flex items-center justify-center bg-[#0F172A]"><Loader2 className="animate-spin text-secondary size-12" /></div>;

  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col font-body bg-slate-50">
      {/* MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
        {isLoaded ? (
          <GoogleMap mapContainerStyle={containerStyle} center={location} zoom={15} options={{ disableDefaultUI: true }}>
            <Marker position={location} icon={{ url: vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 50, height: 50 } as any }} />
          </GoogleMap>
        ) : <div className="h-full w-full bg-slate-200 animate-pulse" />}
        <div className="absolute inset-0 pointer-events-none map-focused-overlay" />
      </div>

      {/* HEADER */}
      <header className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
        <div className="bg-[#0F172A] p-4 rounded-3xl flex items-center gap-4 shadow-2xl text-white">
          <div className="size-12 rounded-2xl bg-secondary flex items-center justify-center">
            {vehicleType === 'moto' ? <Bike size={24} /> : <Car size={24} />}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile?.name}</p>
            <p className="text-lg font-black italic text-accent">{driver?.plateNumber}</p>
          </div>
        </div>
        <div className={`bg-white px-8 py-4 rounded-3xl flex items-center gap-4 border-2 transition-all shadow-2xl ${isOnline ? 'border-secondary' : 'border-slate-100'}`}>
          <span className="text-xs font-black uppercase text-[#0F172A]">{isOnline ? t.startWorking : 'OFFLINE'}</span>
          <Switch checked={isOnline} onCheckedChange={toggleStatus} disabled={isBusy} className="data-[state=checked]:bg-secondary" />
        </div>
      </header>

      {/* BOTTOM PANEL */}
      <main className="absolute bottom-10 left-6 right-6 z-40 max-w-4xl mx-auto w-full">
        {currentRide ? (
          <Card className="rounded-[2.5rem] border-none shadow-3xl overflow-hidden bg-white animate-in slide-in-from-bottom-10">
            <div className="bg-[#0F172A] p-8 text-white flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center">
                  <User className="size-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase leading-none">{currentRide.passengerName}</h3>
                  <div className="flex items-center gap-2 text-accent mt-1">
                    <Star className="size-4 fill-accent" /> <span className="text-sm font-bold">4.8 Rating</span>
                  </div>
                </div>
              </div>
              <a href={`tel:${currentRide.passengerPhone}`} className="size-14 rounded-2xl bg-secondary text-white flex items-center justify-center hover:scale-110 transition-all shadow-xl">
                <Phone className="size-6" />
              </a>
            </div>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pickup</p>
                  <p className="text-lg font-black text-[#0F172A]">{currentRide.pickupLocation}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destination</p>
                  <p className="text-lg font-black text-[#0F172A]">{currentRide.destination}</p>
                </div>
              </div>
              <Button onClick={() => updateDoc(doc(db!, 'rides', currentRide.rideId), { status: currentRide.status === 'accepted' ? 'started' : 'completed' })} className="w-full h-20 rounded-[2rem] bg-[#0F172A] text-white text-xl font-black italic uppercase tracking-tighter shadow-2xl">
                {currentRide.status === 'accepted' ? t.startTrip : t.completeMission}
              </Button>
            </CardContent>
          </Card>
        ) : isOnline ? (
          <div className="space-y-4">
            {requests?.map((req: any) => (
              <Card key={req.rideId} className="rounded-[2.5rem] border-none shadow-3xl bg-white p-8 flex items-center justify-between gap-6 animate-in slide-in-from-right-10">
                <div className="flex items-center gap-6">
                  <div className="size-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <User size={32} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">New Mission</p>
                    <h3 className="text-2xl font-black text-[#0F172A] italic uppercase">{req.passengerName}</h3>
                    <p className="text-sm font-bold text-slate-400">{req.pickupLocation} → {req.destination}</p>
                  </div>
                </div>
                <Button onClick={() => acceptRide(req.rideId)} className="h-16 px-10 rounded-2xl bg-secondary hover:bg-secondary/90 text-white font-black italic uppercase text-lg shadow-xl">
                  {t.takeTrip}
                </Button>
              </Card>
            ))}
            {!requests?.length && (
              <div className="bg-[#0F172A]/90 backdrop-blur-md p-10 rounded-[3rem] text-center text-white space-y-4 shadow-3xl">
                <Navigation className="size-10 mx-auto animate-pulse text-secondary" />
                <h2 className="text-2xl font-black italic uppercase">{t.readyToRide}</h2>
                <p className="text-slate-400 font-bold">Waiting for incoming missions...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <Button onClick={toggleStatus} className="h-28 px-16 rounded-[4rem] bg-[#0F172A] text-white text-4xl font-black italic uppercase shadow-3xl hover:scale-105 transition-all">
              {t.startWorking}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}