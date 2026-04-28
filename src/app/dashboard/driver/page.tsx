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
  Hash,
  Loader2,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Clock,
  Star
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
  height: "100vh",
};

const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function DriverDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  
  const [driverLocation, setDriverLocation] = useState(kigaliCenter);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin size-12 text-primary" />
    </div>
  );
  
  if (!user || !userProfile || !driverProfile) return null;

  if (verificationStatus === 'pending') {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="size-32 rounded-[3rem] bg-accent/20 flex items-center justify-center text-primary shadow-2xl border-4 border-white animate-pulse">
           <Navigation className="size-16" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black italic text-primary uppercase tracking-tighter">WAITING FOR APPROVAL</h1>
          <p className="text-slate-500 font-bold max-w-sm mx-auto italic">
            MUTAMBUKE Admin is verifying your plate: <span className="text-secondary font-black">{plateNumber}</span>. You'll be ready to work soon!
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline" className="h-16 rounded-2xl px-10 font-black uppercase italic border-slate-200 text-slate-400 hover:text-red-500">
           {t.logout}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 relative flex flex-col font-body">
      {/* Full Map Background */}
      <div className="absolute inset-0 z-0">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={driverLocation}
            zoom={15}
            options={{ disableDefaultUI: true }}
          >
            <Marker 
              position={driverLocation}
              icon={{
                url: vehicleType === 'moto' 
                  ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' 
                  : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png',
                scaledSize: { width: 50, height: 50 } as any
              }}
            />
          </GoogleMap>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="size-12 animate-spin text-primary" />
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none map-gradient-overlay" />
      </div>

      {/* Top Header Overlay */}
      <header className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
        <div className="glass-panel p-4 rounded-[2rem] flex items-center gap-4 shadow-3xl">
          <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center">
             {vehicleType === 'moto' ? <Bike size={24} /> : <Car size={24} />}
          </div>
          <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{userProfile.name}</p>
             <p className="text-lg font-black italic tracking-tighter text-primary">{plateNumber}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {vehicleType === 'taxi' && (
             <div className="glass-panel px-6 py-4 rounded-3xl hidden md:flex items-center gap-3">
                <DollarSign className="text-secondary size-5" />
                <p className="font-black text-xl italic text-primary">24,500 RWF</p>
             </div>
           )}
           <div className={`glass-panel px-8 py-4 rounded-3xl flex items-center gap-4 border-2 transition-all ${isOnline ? 'border-secondary/50' : 'border-slate-200'}`}>
              <span className="text-xs font-black uppercase italic tracking-widest text-primary">{isOnline ? t.goOnline : 'OFFLINE'}</span>
              <Switch checked={isOnline} onCheckedChange={toggleStatus} disabled={isBusy} className="data-[state=checked]:bg-secondary" />
           </div>
        </div>
      </header>

      {/* Main Bottom Panel */}
      <main className="absolute bottom-6 left-6 right-6 z-40 max-w-4xl mx-auto flex flex-col gap-4">
        {currentRide ? (
          <Card className="rounded-[3rem] border-none shadow-3xl overflow-hidden bg-white animate-in slide-in-from-bottom-20 duration-500">
             <div className="bg-primary p-10 text-white flex items-center justify-between">
                <div className="flex items-center gap-6">
                   <div className="size-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center backdrop-blur-md">
                      <User className="size-8" />
                   </div>
                   <div>
                      <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-1">{currentRide.passengerName}</h3>
                      <div className="flex items-center gap-2 opacity-70">
                        <Star className="size-4 fill-accent text-accent" />
                        <span className="text-sm font-bold">4.8 Rating</span>
                      </div>
                   </div>
                </div>
                <a href={`tel:${currentRide.passengerPhone}`} className="size-16 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all">
                  <Phone className="size-8" />
                </a>
             </div>
             <CardContent className="p-10 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.pickupAt}</p>
                      <p className="text-xl font-black text-primary">{currentRide.pickupLocation}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.destination}</p>
                      <p className="text-xl font-black text-primary">{currentRide.destination}</p>
                   </div>
                </div>
                {vehicleType === 'taxi' && (
                  <div className="p-6 bg-slate-50 rounded-2xl flex items-center justify-between border-2 border-dashed border-slate-200">
                    <p className="font-bold text-slate-500 uppercase italic">Estimated Fare</p>
                    <p className="text-2xl font-black text-secondary">3,500 RWF</p>
                  </div>
                )}
                <Button 
                   onClick={() => currentRide.status === 'accepted' ? startRide(currentRide.rideId) : completeRide(currentRide.rideId)}
                   className="w-full h-24 rounded-[2.5rem] bg-primary hover:bg-primary/90 text-2xl font-black italic uppercase tracking-tighter shadow-3xl transition-all"
                >
                   {currentRide.status === 'accepted' ? t.startTrip : t.completeMission}
                </Button>
             </CardContent>
          </Card>
        ) : isOnline ? (
          <div className="space-y-4">
             {incomingRequests && incomingRequests.length > 0 ? (
               incomingRequests.map(req => (
                 <Card key={req.rideId} className="rounded-[3rem] border-none shadow-3xl bg-white p-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-right-20">
                    <div className="flex items-center gap-6">
                       <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <User size={32} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-1">NEW MISSION</p>
                          <h3 className="text-2xl font-black text-primary italic uppercase tracking-tighter">{req.passengerName}</h3>
                          <p className="text-sm font-bold text-slate-400 italic">{req.pickupLocation} → {req.destination}</p>
                       </div>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                       <Button variant="ghost" className="flex-1 md:w-24 h-16 rounded-2xl text-slate-400 font-bold uppercase italic">Ignore</Button>
                       <Button 
                        onClick={() => acceptRide(req.rideId)}
                        className="flex-[2] md:w-48 h-16 rounded-2xl bg-secondary hover:bg-secondary/90 text-white font-black italic uppercase text-lg shadow-xl"
                       >
                         {t.acceptRide}
                       </Button>
                    </div>
                 </Card>
               ))
             ) : (
               <div className="glass-panel p-10 rounded-[3rem] flex flex-col items-center gap-4 text-center">
                  <div className="size-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                     <Navigation className="size-8 animate-pulse" />
                  </div>
                  <p className="text-2xl font-black italic text-primary uppercase tracking-tighter">{t.readyToRide}</p>
                  <p className="text-slate-400 font-bold italic">Waiting for incoming missions on MUTAMBUKE network...</p>
               </div>
             )}
          </div>
        ) : (
          <div className="flex justify-center">
             <Button 
                onClick={toggleStatus}
                className="h-28 px-16 rounded-[4rem] bg-white text-primary text-4xl font-black italic uppercase shadow-3xl hover:bg-slate-50 active:scale-95 transition-all"
             >
                {t.goOnline}
             </Button>
          </div>
        )}

        {/* Driver Stats (Only for Taxi or detailed Moto view) */}
        {!currentRide && isOnline && (
          <div className="grid grid-cols-3 gap-4 mb-4">
             <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                <Clock className="size-5 text-slate-400 mb-2" />
                <p className="text-lg font-black text-primary leading-none">6.5h</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">ONLINE</p>
             </div>
             <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                <TrendingUp className="size-5 text-secondary mb-2" />
                <p className="text-lg font-black text-primary leading-none">14</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">TRIPS</p>
             </div>
             <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                <Star className="size-5 text-accent mb-2" />
                <p className="text-lg font-black text-primary leading-none">4.9</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">RATING</p>
             </div>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="absolute bottom-4 left-0 right-0 z-40 text-center pointer-events-none">
         <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.8em] italic">MUTAMBUKE SMART SYSTEM</p>
      </footer>
    </div>
  );
}