'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  MapPin, User, LogOut, Loader2, Navigation, Bike, Car as CarIcon,
  X, Star, Phone, MessageSquare, Send, LocateFixed,
  Menu, Bell, ChevronDown, Home, History, Search, Plus
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp, updateDoc, addDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

const MAP_LIGHT_STYLE = [
  { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }
];

export default function PassengerDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
  const [isRequesting, setIsRequesting] = useState(false);
  const [passengerLocation, setPassengerLocation] = useState(kigaliCenter);
  const [pickupAddress, setPickupLocation] = useState('Enter pickup location');
  const [destination, setDestination] = useState('');
  const [vehicleType, setVehicleType] = useState<'moto' | 'taxi'>('moto');
  
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const { data: userProfile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);

  const activeRideQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', 'in', ['requested', 'accepted', 'started'])
    );
  }, [db, user]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  const rideHistoryQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [db, user]);
  const { data: rideHistory } = useCollection(rideHistoryQuery);

  const ridersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'drivers'),
      where('status', '==', 'online'),
      where('verificationStatus', '==', 'approved')
    );
  }, [db]);
  const { data: availableDrivers } = useCollection(ridersQuery);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPassengerLocation(loc);
        },
        null, { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  async function handleFindRide() {
    if (!db || !user) return;
    setIsRequesting(true);
    try {
      const rideId = doc(collection(db, 'rides')).id;
      await setDoc(doc(db, 'rides', rideId), {
        rideId,
        passengerId: user.uid,
        passengerName: userProfile?.name || 'User',
        passengerPhone: userProfile?.phone || '',
        pickupLocation: passengerLocation,
        destination: destination || 'Selected Destination',
        status: 'requested',
        vehicleType: vehicleType,
        createdAt: serverTimestamp()
      });
      toast({ title: "Gushakisha umushoferi..." });
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setIsRequesting(false);
    }
  }

  async function handleLogout() {
    if (!auth) return;
    await signOut(auth);
    router.replace('/lib/auth');
  }

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-secondary size-10" /></div>;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50 relative">
      
      {/* TOP HEADER */}
      <header className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-4 z-50 bg-white shadow-sm">
        <Button variant="ghost" size="icon" className="text-slate-600">
          <Menu size={24} />
        </Button>
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image src="/logo.png" alt="MUTAMBUKE" fill className="object-contain" />
          </div>
          <span className="font-black text-lg tracking-tight text-[#0F172A]">MUTAMBUKE</span>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" className="text-slate-600">
            <Bell size={24} />
            <div className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white" />
          </Button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative pt-16">
        {activeTab === 'home' ? (
          <>
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={passengerLocation}
                zoom={15}
                options={{
                  disableDefaultUI: true,
                  styles: MAP_LIGHT_STYLE
                }}
                onLoad={(map) => { mapRef.current = map; }}
              >
                {/* User Current Location (Blue Dot) */}
                <Marker position={passengerLocation} icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#3B82F6",
                  fillOpacity: 1,
                  strokeWeight: 4,
                  strokeColor: "rgba(59, 130, 246, 0.2)",
                }} />

                {/* Draw nearby drivers */}
                {availableDrivers?.map((d: any) => (
                  <Marker 
                    key={d.driverId}
                    position={d.currentLocation}
                    icon={{ 
                      url: d.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', 
                      scaledSize: { width: 32, height: 32 } as any 
                    }}
                  />
                ))}
              </GoogleMap>
            ) : <div className="size-full bg-slate-100" />}

            {/* Top Location Selection Card */}
            <div className="absolute top-20 inset-x-4 z-20">
               <Card className="p-4 flex items-center justify-between shadow-xl border-none rounded-2xl bg-white">
                  <div className="flex items-center gap-3">
                     <div className="size-2 rounded-full bg-secondary" />
                     <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Aho uri</p>
                        <p className="text-sm font-black text-[#0F172A]">Kigali, Rwanda</p>
                     </div>
                  </div>
                  <ChevronDown className="text-slate-400" size={20} />
               </Card>
            </div>

            {/* Locate Me Button */}
            <Button 
              onClick={() => mapRef.current?.panTo(passengerLocation)} 
              size="icon" 
              className="absolute bottom-[44%] right-4 z-20 rounded-full bg-white shadow-xl text-slate-600 hover:bg-slate-50 border-none"
            >
              <LocateFixed size={20} />
            </Button>

            {/* Floating Bottom Ride Panel */}
            <div className="absolute bottom-16 inset-x-0 z-40">
              <div className="w-full bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-8 border-t border-slate-100">
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
                
                {currentRide ? (
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="size-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                              {currentRide.vehicleType === 'moto' ? <Bike size={32}/> : <CarIcon size={32}/>}
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentRide.status === 'requested' ? 'GUSHAKISHA...' : 'UMUSHOFERI ARI MU NZIRA'}</p>
                              <h3 className="text-lg font-black text-[#0F172A]">{currentRide.driverName || 'Finding Driver...'}</h3>
                           </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => updateDoc(doc(db!, 'rides', currentRide.rideId), { status: 'cancelled' })} className="text-red-500"><X size={24}/></Button>
                     </div>
                     <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                        <Loader2 className="animate-spin text-secondary mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Turagushakira umumotari uri hafi...</p>
                     </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Location Form */}
                    <div className="relative space-y-0.5">
                      <div className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                        <div className="size-2.5 rounded-full bg-secondary ring-4 ring-secondary/10" />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aho uva</p>
                          <p className="text-sm font-bold text-slate-300">Enter pickup location</p>
                        </div>
                        <Plus className="text-slate-300" size={18} />
                      </div>
                      
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-slate-100" />
                      
                      <div className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                        <MapPin className="text-orange-500" size={14} />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aho ujya?</p>
                          <Input 
                            placeholder="Enter destination"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="h-6 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-bold text-[#0F172A] placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Ride Options */}
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setVehicleType('moto')}
                        className={`p-4 rounded-2xl flex items-center gap-4 transition-all ${vehicleType === 'moto' ? 'bg-secondary/5 border-2 border-secondary' : 'bg-slate-50 border-2 border-transparent'}`}
                      >
                        <Bike className={vehicleType === 'moto' ? 'text-secondary' : 'text-slate-400'} size={24} />
                        <div className="text-left">
                          <p className="text-xs font-black text-[#0F172A]">Moto</p>
                          <p className="text-[10px] font-bold text-slate-400">From 1,200 RWF</p>
                        </div>
                      </button>
                      <button 
                        onClick={() => setVehicleType('taxi')}
                        className={`p-4 rounded-2xl flex items-center gap-4 transition-all ${vehicleType === 'taxi' ? 'bg-secondary/5 border-2 border-secondary' : 'bg-slate-50 border-2 border-transparent'}`}
                      >
                        <CarIcon className={vehicleType === 'taxi' ? 'text-secondary' : 'text-slate-400'} size={24} />
                        <div className="text-left">
                          <p className="text-xs font-black text-[#0F172A]">Taxi</p>
                          <p className="text-[10px] font-bold text-slate-400">From 2,500 RWF</p>
                        </div>
                      </button>
                    </div>

                    {/* Action Button */}
                    <Button 
                      onClick={handleFindRide}
                      disabled={isRequesting}
                      className="w-full h-14 rounded-2xl bg-secondary hover:bg-secondary/90 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-secondary/20"
                    >
                      {isRequesting ? <Loader2 className="animate-spin" /> : 'SHAKA URUGENDO'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : activeTab === 'history' ? (
          <div className="p-6 space-y-6 overflow-y-auto h-full pb-32">
             <h2 className="text-2xl font-black text-[#0F172A] uppercase tracking-tight">IBYATAMBUTSE</h2>
             <div className="grid gap-4">
                {rideHistory?.map((ride: any) => (
                   <Card key={ride.id} className="p-4 rounded-2xl border-none bg-white shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                           {ride.vehicleType === 'moto' ? <Bike size={24}/> : <CarIcon size={24}/>}
                        </div>
                        <div>
                           <p className="font-bold text-[#0F172A] text-sm uppercase">{ride.driverName || 'Driver'}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">{ride.createdAt?.toDate ? format(ride.createdAt.toDate(), 'MMM dd, p') : 'Recent'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-black text-secondary uppercase">Completed</p>
                         <p className="text-[10px] font-bold text-slate-400">800 RWF</p>
                      </div>
                   </Card>
                ))}
                {!rideHistory?.length && (
                  <div className="py-20 text-center opacity-20">
                    <History size={64} className="mx-auto mb-4 text-slate-400" />
                    <p className="font-black uppercase text-xs tracking-widest">Nta mateka ahari</p>
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="p-6 space-y-8 overflow-y-auto h-full pb-32">
             <div className="text-center py-10">
                <div className="size-24 rounded-[2rem] bg-secondary/10 flex items-center justify-center text-secondary mx-auto mb-4 border-2 border-secondary/20">
                   <User size={48} strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-black text-[#0F172A] uppercase tracking-tight">{userProfile?.name}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{userProfile?.phone}</p>
             </div>
             
             <div className="grid gap-4">
                <div className="p-5 rounded-2xl bg-white shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Star size={20}/></div>
                      <p className="text-xs font-black text-[#0F172A] uppercase">Rating</p>
                   </div>
                   <span className="font-black text-secondary">4.8</span>
                </div>
                <div className="p-5 rounded-2xl bg-white shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><History size={20}/></div>
                      <p className="text-xs font-black text-[#0F172A] uppercase">Total Rides</p>
                   </div>
                   <span className="font-black text-[#0F172A]">{rideHistory?.length || 0}</span>
                </div>
             </div>

             <Button 
               onClick={handleLogout}
               variant="outline" 
               className="w-full h-14 rounded-2xl border-red-100 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50"
             >
               <LogOut size={18} className="mr-2" /> GUSOHOKA
             </Button>
          </div>
        )}
      </main>

      {/* BOTTOM TAB NAVIGATION */}
      <nav className="h-16 bg-white border-t border-slate-100 flex items-center justify-around px-4 z-50">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-secondary' : 'text-slate-300'}`}
        >
          <Home size={22} fill={activeTab === 'home' ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-secondary' : 'text-slate-300'}`}
        >
          <History size={22} />
          <span className="text-[10px] font-black uppercase tracking-widest">Trips</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-secondary' : 'text-slate-300'}`}
        >
          <User size={22} fill={activeTab === 'profile' ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-black uppercase tracking-widest">Profile</span>
        </button>
      </nav>

    </div>
  );
}
