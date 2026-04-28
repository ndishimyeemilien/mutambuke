
'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Bike, 
  LogOut, 
  MapPin, 
  User, 
  Phone, 
  Flag, 
  Car,
  Navigation,
  X,
  Layers,
  Map as MapIcon,
  Globe,
  Hash,
  Loader2
} from 'lucide-react';
import { collection, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function DriverDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  
  const [driverLocation, setDriverLocation] = useState(kigaliCenter);
  const [mapType, setMapType] = useState<google.maps.MapTypeId | string>('roadmap');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const { data: userProfile, loading: userLoading } = useDoc(user ? `users/${user.uid}` : null);
  const { data: driverProfile, loading: driverLoading } = useDoc(user ? `drivers/${user.uid}` : null);

  const lang = (userProfile?.language as Language) || 'rw';
  const t = translations[lang];

  const status = driverProfile?.status || 'offline';
  const isOnline = status === 'online';
  const isBusy = status === 'busy';
  const verificationStatus = driverProfile?.verificationStatus || 'pending';
  const isApproved = verificationStatus === 'approved';
  const vehicleType = driverProfile?.vehicleType || 'moto';
  const plateNumber = driverProfile?.plateNumber || '---';

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !isOnline || !isApproved) return null;
    return query(
      collection(db, 'rides'), 
      where('status', '==', 'requested'), 
      where('vehicleType', '==', vehicleType)
    );
  }, [db, isOnline, isApproved, vehicleType]);
  
  const { data: incomingRequests } = useCollection(requestsQuery);

  const activeRideQuery = useMemoFirebase(() => {
    if (!db || !user || !isApproved) return null;
    return query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'started'])
    );
  }, [db, user, isApproved]);
  
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setDriverLocation(newLoc);
          if (db && user && (isOnline || isBusy) && isApproved) {
            updateDoc(doc(db, 'drivers', user.uid), {
              currentLocation: newLoc,
              updatedAt: serverTimestamp()
            });
          }
        },
        () => console.log("Geolocation error"),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [db, user, isOnline, isBusy, isApproved]);

  async function toggleStatus() {
    if (!db || !user || !isApproved || isBusy) return;
    const newStatus = isOnline ? 'offline' : 'online';
    await updateDoc(doc(db, 'drivers', user.uid), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  }

  async function acceptRide(rideId: string) {
    if (!db || !user) return;
    await updateDoc(doc(db, 'rides', rideId), {
      status: 'accepted',
      driverId: user.uid,
      driverName: userProfile?.name || 'Driver',
      driverPhone: userProfile?.phone || ''
    });
    await updateDoc(doc(db, 'drivers', user.uid), {
      status: 'busy',
      updatedAt: serverTimestamp()
    });
  }

  async function rejectRide(rideId: string) {
    if (!db) return;
    await updateDoc(doc(db, 'rides', rideId), { status: 'cancelled' });
  }

  async function startRide(rideId: string) {
    if (!db) return;
    await updateDoc(doc(db, 'rides', rideId), { status: 'started' });
  }

  async function completeRide(rideId: string) {
    if (!db || !user) return;
    await updateDoc(doc(db, 'rides', rideId), { status: 'completed' });
    await updateDoc(doc(db, 'drivers', user.uid), {
      status: 'online',
      updatedAt: serverTimestamp()
    });
  }

  async function handleLogout() {
    if (auth) {
      await signOut(auth);
      router.replace('/landing');
    }
  }

  if (userLoading || driverLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin size-12 text-primary" />
    </div>
  );
  
  if (!user || !userProfile || !driverProfile) return null;

  if (verificationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="size-32 rounded-[2.5rem] bg-orange-100 flex items-center justify-center text-orange-600 mb-8 shadow-xl">
          <Loader2 className="size-16 animate-spin" />
        </div>
        <h1 className="text-4xl font-black italic text-slate-900 uppercase mb-4 tracking-tighter">Account Under Review</h1>
        <p className="text-xl text-slate-500 font-medium max-w-md mx-auto mb-10 leading-relaxed">
          The MUTAMBUKE admin team is verifying your documents and plate: <span className="text-primary font-black">{plateNumber}</span>. This usually takes a few hours.
        </p>
        <Button onClick={handleLogout} variant="outline" className="h-16 rounded-2xl px-12 font-black uppercase italic border-slate-200 text-lg hover:bg-slate-100 transition-all">
          <LogOut className="size-5 mr-3" /> {t.logout}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Background Map - Full Screen */}
      <div className="absolute inset-0 z-0 bg-slate-200">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={driverLocation}
            zoom={15}
            mapTypeId={mapType}
            options={{
              disableDefaultUI: true,
            }}
          >
            <Marker 
              position={driverLocation}
              icon={{
                url: vehicleType === 'moto' 
                  ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' 
                  : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png',
                scaledSize: { width: 55, height: 55 } as any
              }}
            />
          </GoogleMap>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-slate-100">
            <Loader2 className="size-12 animate-spin text-slate-300" />
          </div>
        )}
      </div>

      {/* Header Overlay */}
      <header className="relative z-20 p-6 md:p-10 pointer-events-none">
        <Card className="rounded-[2.5rem] border-none shadow-3xl bg-white/95 backdrop-blur-2xl max-w-2xl mx-auto pointer-events-auto">
          <CardContent className="p-6 md:p-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="size-16 rounded-[1.5rem] bg-primary text-white flex items-center justify-center shadow-lg">
                {vehicleType === 'moto' ? <Bike className="size-8" /> : <Car className="size-8" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase leading-none">{userProfile.name}</p>
                  <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-600 uppercase tracking-tighter flex items-center gap-1">
                    <Hash className="size-3" /> {plateNumber}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`size-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : isBusy ? 'bg-orange-500' : 'bg-slate-300'}`} />
                  <p className="font-black text-2xl text-slate-900 italic uppercase leading-none tracking-tighter">
                    {isBusy ? 'Busy' : isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {!isBusy && (
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isOnline ? 'Active' : 'Standby'}</span>
                    <Switch checked={isOnline} onCheckedChange={toggleStatus} className="scale-125 data-[state=checked]:bg-green-500" />
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout} className="size-14 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                <LogOut className="size-7" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </header>

      {/* Map Style Controls */}
      <div className="absolute top-40 md:top-48 right-6 md:right-10 z-40 flex flex-col gap-3 pointer-events-auto">
        <Button variant="secondary" size="icon" onClick={() => setMapType('roadmap')} className={`size-14 rounded-2xl shadow-2xl border-[3px] transition-all hover:scale-110 ${mapType === 'roadmap' ? 'border-primary bg-white' : 'border-white bg-white/80'}`}><MapIcon className="size-7" /></Button>
        <Button variant="secondary" size="icon" onClick={() => setMapType('satellite')} className={`size-14 rounded-2xl shadow-2xl border-[3px] transition-all hover:scale-110 ${mapType === 'satellite' ? 'border-primary bg-white' : 'border-white bg-white/80'}`}><Globe className="size-7" /></Button>
        <Button variant="secondary" size="icon" onClick={() => setMapType('hybrid')} className={`size-14 rounded-2xl shadow-2xl border-[3px] transition-all hover:scale-110 ${mapType === 'hybrid' ? 'border-primary bg-white' : 'border-white bg-white/80'}`}><Layers className="size-7" /></Button>
      </div>

      {/* Active Content Overlay */}
      <main className="flex-1 relative z-10 flex flex-col justify-end p-6 md:p-12 space-y-6 pointer-events-none overflow-y-auto no-scrollbar">
        <div className="pointer-events-auto w-full max-w-4xl mx-auto space-y-6">
          {currentRide ? (
            <Card className="rounded-[3.5rem] border-none shadow-3xl overflow-hidden bg-white animate-in slide-in-from-bottom-20 duration-500">
              <div className="bg-primary p-8 md:p-10 text-white flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="size-20 rounded-[2rem] bg-white/20 flex items-center justify-center backdrop-blur-lg shadow-inner"><User className="size-10" /></div>
                  <div className="space-y-1">
                    <h3 className="text-4xl font-black italic uppercase leading-none tracking-tighter">{currentRide.passengerName}</h3>
                    <p className="text-xs font-black opacity-80 tracking-[0.3em] uppercase">MISSION IN PROGRESS</p>
                  </div>
                </div>
                <a href={`tel:${currentRide.passengerPhone}`} className="size-16 rounded-[1.5rem] bg-white text-primary flex items-center justify-center hover:bg-slate-50 transition-all shadow-xl active:scale-95">
                  <Phone className="size-8" />
                </a>
              </div>
              <CardContent className="p-10 md:p-14 space-y-12">
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="flex gap-6 items-start">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><MapPin className="size-6" /></div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase">{t.pickupAt}</p>
                      <p className="font-black text-2xl text-slate-900 leading-tight">{currentRide.pickupLocation}</p>
                    </div>
                  </div>
                  <div className="flex gap-6 items-start">
                    <div className="size-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0"><Flag className="size-6" /></div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase">{t.destination}</p>
                      <p className="font-black text-2xl text-slate-900 leading-tight">{currentRide.destination}</p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => currentRide.status === 'accepted' ? startRide(currentRide.rideId) : completeRide(currentRide.rideId)}
                  className="w-full h-24 rounded-[2.5rem] bg-primary hover:bg-primary/90 text-3xl font-black italic shadow-3xl transition-all active:scale-[0.98]"
                >
                  {currentRide.status === 'accepted' ? t.startTrip : t.completeMission}
                </Button>
              </CardContent>
            </Card>
          ) : isOnline ? (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {incomingRequests && incomingRequests.length > 0 ? (
                incomingRequests.map(req => (
                  <Card key={req.rideId} className="rounded-[3rem] border-none shadow-3xl bg-white p-8 animate-in slide-in-from-right-20 duration-500">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-4">
                        <div className="size-14 rounded-[1.25rem] bg-slate-100 flex items-center justify-center text-slate-400"><User className="size-7" /></div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">NEW REQUEST</p>
                            <p className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">{req.passengerName}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6 mb-10">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.pickupAt}</p>
                        <p className="font-bold text-slate-900 text-lg line-clamp-1">{req.pickupLocation}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.destination}</p>
                        <p className="font-bold text-slate-900 text-lg line-clamp-1">{req.destination}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button onClick={() => rejectRide(req.rideId)} variant="ghost" className="flex-1 h-16 rounded-2xl text-slate-400 font-bold uppercase italic border-slate-100 text-sm"><X className="size-5 mr-2" /> Reject</Button>
                      <Button onClick={() => acceptRide(req.rideId)} className="flex-[2] h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black italic uppercase text-lg shadow-xl">{t.acceptRide}</Button>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="py-24 md:py-32 text-center space-y-6 bg-white/10 backdrop-blur-sm rounded-[4rem] border border-white/20">
                  <div className="relative mx-auto size-28">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    <div className="relative size-28 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-2xl">
                      <Navigation className="size-14 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-4xl font-black italic text-white uppercase tracking-tighter drop-shadow-lg">{t.readyToRide}</p>
                    <p className="text-white/60 font-bold italic">Waiting for incoming missions...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 md:py-40 text-center">
              <Button onClick={toggleStatus} className="bg-white text-slate-900 h-28 px-16 rounded-[3.5rem] text-3xl font-black italic uppercase shadow-3xl pointer-events-auto hover:bg-slate-50 active:scale-95 transition-all hover:scale-105">
                {t.goOnline}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer System Attribution */}
      <footer className="relative z-20 p-8 flex justify-center pointer-events-none">
         <p className="text-slate-400/30 font-black italic uppercase text-[10px] tracking-[0.6em]">
            MUTAMBUKE SMART SYSTEM © 2025
         </p>
      </footer>
    </div>
  );
}
