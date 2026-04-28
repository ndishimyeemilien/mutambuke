
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
  DollarSign,
  TrendingUp,
  X,
  Clock,
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

  const completedRidesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', '==', 'completed')
    );
  }, [db, user]);
  const { data: completedRides } = useCollection(completedRidesQuery);

  const stats = {
    totalTrips: completedRides?.length || 0,
    totalEarnings: (completedRides?.length || 0) * (vehicleType === 'moto' ? 500 : 1500)
  };

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
      <Loader2 className="animate-spin size-10 text-primary" />
    </div>
  );
  
  if (!user || !userProfile || !driverProfile) return null;

  if (verificationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="size-24 rounded-[2rem] bg-orange-100 flex items-center justify-center text-orange-600 mb-6">
          <Clock className="size-12" />
        </div>
        <h1 className="text-3xl font-black italic text-slate-900 uppercase mb-2">Account Under Review</h1>
        <p className="text-slate-500 font-medium max-w-xs mx-auto mb-8">
          The MUTAMBUKE admin team is verifying your documents and plate: <span className="text-primary font-bold">{plateNumber}</span>. This usually takes 24 hours.
        </p>
        <Button onClick={handleLogout} variant="outline" className="h-14 rounded-2xl px-10 font-black uppercase italic border-slate-200">
          <LogOut className="size-4 mr-2" /> {t.logout}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
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
                scaledSize: { width: 45, height: 45 } as any
              }}
            />
          </GoogleMap>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-slate-100">
            <Loader2 className="size-10 animate-spin text-slate-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/60 pointer-events-none" />
      </div>

      <header className="relative z-20 p-4">
        <Card className="rounded-3xl border-none shadow-2xl bg-white/90 backdrop-blur-xl max-w-md mx-auto">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center">
                {vehicleType === 'moto' ? <Bike className="size-6" /> : <Car className="size-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase leading-none">{userProfile.name}</p>
                  <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase tracking-tighter flex items-center gap-1">
                    <Hash className="size-2" /> {plateNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : isBusy ? 'bg-orange-500' : 'bg-slate-300'}`} />
                  <p className="font-black text-slate-900 italic uppercase leading-none">
                    {isBusy ? 'Busy' : isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isBusy && <Switch checked={isOnline} onCheckedChange={toggleStatus} className="data-[state=checked]:bg-green-500" />}
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 rounded-full">
                <LogOut className="size-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </header>

      <div className="absolute top-24 right-4 z-40 flex flex-col gap-2 pointer-events-auto">
        <Button variant="secondary" size="icon" onClick={() => setMapType('roadmap')} className={`rounded-xl shadow-lg border-2 ${mapType === 'roadmap' ? 'border-primary' : 'border-white'}`}><MapIcon className="size-5" /></Button>
        <Button variant="secondary" size="icon" onClick={() => setMapType('satellite')} className={`rounded-xl shadow-lg border-2 ${mapType === 'satellite' ? 'border-primary' : 'border-white'}`}><Globe className="size-5" /></Button>
        <Button variant="secondary" size="icon" onClick={() => setMapType('hybrid')} className={`rounded-xl shadow-lg border-2 ${mapType === 'hybrid' ? 'border-primary' : 'border-white'}`}><Layers className="size-5" /></Button>
      </div>

      <main className="flex-1 relative z-10 flex flex-col justify-end p-4 md:p-6 space-y-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-xl mx-auto space-y-4">
          <div className="flex gap-4">
            <Card className="flex-1 rounded-3xl border-none shadow-xl bg-white/95 backdrop-blur-md p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center"><DollarSign className="size-5" /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{t.earnings}</p>
                <p className="font-black text-slate-900 leading-none">{stats.totalEarnings} RWF</p>
              </div>
            </Card>
            <Card className="flex-1 rounded-3xl border-none shadow-xl bg-white/95 backdrop-blur-md p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><TrendingUp className="size-5" /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{t.trips}</p>
                <p className="font-black text-slate-900 leading-none">{stats.totalTrips}</p>
              </div>
            </Card>
          </div>

          {currentRide ? (
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white animate-in slide-in-from-bottom-10">
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center"><User className="size-8" /></div>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase leading-none">{currentRide.passengerName}</h3>
                    <p className="text-[10px] font-bold opacity-70 tracking-widest mt-1 uppercase">MISSION IN PROGRESS</p>
                  </div>
                </div>
                <a href={`tel:${currentRide.passengerPhone}`} className="size-12 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30">
                  <Phone className="size-6" />
                </a>
              </div>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    <MapPin className="size-5 text-primary mt-1" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{t.pickupAt}</p>
                      <p className="font-black text-lg text-slate-900">{currentRide.pickupLocation}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <Flag className="size-5 text-secondary mt-1" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{t.destination}</p>
                      <p className="font-black text-lg text-slate-900">{currentRide.destination}</p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => currentRide.status === 'accepted' ? startRide(currentRide.rideId) : completeRide(currentRide.rideId)}
                  className="w-full h-20 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white text-2xl font-black italic shadow-2xl"
                >
                  {currentRide.status === 'accepted' ? t.startTrip : t.completeMission}
                </Button>
              </CardContent>
            </Card>
          ) : isOnline ? (
            <div className="space-y-4">
              {incomingRequests && incomingRequests.length > 0 ? (
                incomingRequests.map(req => (
                  <Card key={req.rideId} className="rounded-[2rem] border-none shadow-2xl bg-white p-6 animate-in slide-in-from-right-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center"><User className="size-5" /></div>
                        <p className="font-black text-slate-900 italic uppercase">{req.passengerName}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">{t.pickupAt}</p>
                        <p className="font-bold text-slate-900 text-sm truncate">{req.pickupLocation}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">{t.destination}</p>
                        <p className="font-bold text-slate-900 text-sm truncate">{req.destination}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => rejectRide(req.rideId)} variant="ghost" className="flex-1 h-12 rounded-xl text-slate-400 font-bold uppercase italic border-slate-100"><X className="size-4 mr-2" /> Reject</Button>
                      <Button onClick={() => acceptRide(req.rideId)} className="flex-[2] h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black italic uppercase">{t.acceptRide}</Button>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="relative mx-auto size-20">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    <div className="relative size-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Navigation className="size-10 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xl font-black italic text-white uppercase tracking-tighter">{t.readyToRide}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center">
              <Button onClick={toggleStatus} className="bg-white text-slate-900 h-20 px-12 rounded-[2rem] font-black italic uppercase shadow-2xl pointer-events-auto hover:bg-slate-50 active:scale-95 transition-all">
                {t.goOnline}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
