'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  MapPin, User, LogOut, Loader2, Navigation, Bike, Car as CarIcon,
  X, Star, Phone, MessageSquare, Send, LocateFixed,
  Satellite, Sun, Moon, ArrowRight, Frown, UserCircle, Mail, ShieldCheck, History, Menu, Search, Clock
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

const MAP_DARK_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "feature": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "feature": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "feature": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "feature": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "feature": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "feature": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "feature": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
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
  const [destination, setDestination] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [mapTypeId, setMapTypeId] = useState<google.maps.MapTypeId | string>('roadmap');
  const [chatMessage, setChatMessage] = useState('');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  
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

  const historyQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [db, user]);
  const { data: rideHistory } = useCollection(historyQuery);

  const { data: driverData } = useDoc(currentRide?.driverId ? `drivers/${currentRide.driverId}` : null);

  const ridersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'drivers'),
      where('status', '==', 'online'),
      where('verificationStatus', '==', 'approved')
    );
  }, [db]);
  const { data: availableDrivers } = useCollection(ridersQuery);

  const chatQuery = useMemoFirebase(() => {
    if (!db || !currentRide) return null;
    return query(
      collection(db, 'rides', currentRide.rideId, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [db, currentRide]);
  const { data: messages } = useCollection(chatQuery);

  const lang = (userProfile?.language as Language) || 'rw';
  const t = translations[lang];

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPassengerLocation(loc);
          if (db && currentRide && currentRide.status !== 'requested') {
            updateDoc(doc(db, 'rides', currentRide.rideId), { passengerLocation: loc });
          }
        },
        null, { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [db, currentRide]);

  useEffect(() => {
    if (isLoaded && driverData?.currentLocation && passengerLocation && currentRide) {
      const service = new google.maps.DirectionsService();
      service.route({
          origin: driverData.currentLocation,
          destination: passengerLocation,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result) {
            setDirections(result);
            setDistance(result.routes[0].legs[0].distance?.text || null);
          }
        }
      );
    } else {
      setDirections(null);
      setDistance(null);
    }
  }, [isLoaded, driverData?.currentLocation, passengerLocation, currentRide]);

  async function handleQuickRequest(type: 'moto' | 'taxi') {
    if (!db || !user) return;
    setIsRequesting(true);
    try {
      const rideId = doc(collection(db, 'rides')).id;
      await setDoc(doc(db, 'rides', rideId), {
        rideId,
        passengerId: user.uid,
        passengerName: userProfile?.name || 'Anonymous',
        passengerPhone: userProfile?.phone || '',
        pickupLocation: passengerLocation,
        passengerLocation: passengerLocation,
        destination: destination || 'Live Destination',
        status: 'requested',
        vehicleType: type,
        createdAt: serverTimestamp()
      });
      toast({ title: t.searching });
    } catch (e: any) {
      toast({ variant: "destructive", description: e.message });
    } finally {
      setIsRequesting(false);
      setShowOptions(false);
    }
  }

  async function cancelRide() {
    if (!db || !currentRide) return;
    await updateDoc(doc(db, 'rides', currentRide.rideId), { status: 'cancelled' });
  }

  async function sendMessage() {
    if (!db || !currentRide || !chatMessage.trim()) return;
    const msg = chatMessage;
    setChatMessage('');
    await addDoc(collection(db, 'rides', currentRide.rideId, 'messages'), {
      text: msg,
      senderId: user?.uid,
      senderName: userProfile?.name || 'User',
      createdAt: serverTimestamp()
    });
  }

  async function handleLogout() {
    if (!auth) return;
    await signOut(auth);
    router.replace('/lib/auth');
  }

  if (authLoading || profileLoading) return <div className="h-screen flex items-center justify-center bg-[#0F172A]"><Loader2 className="animate-spin text-secondary size-10" /></div>;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0F172A] relative">
      
      {/* Navbar UI (Floating) */}
      <header className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 z-50 bg-gradient-to-b from-[#0F172A]/80 to-transparent">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white rounded-full bg-black/20 backdrop-blur-md">
            <Menu size={20} />
          </Button>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
               <Image src="/logo.png" alt="Logo" width={24} height={24} />
            </div>
            <span className="font-black text-sm tracking-tighter uppercase text-white">MUTAMBUKE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'hybrid' : 'roadmap')} size="icon" variant="ghost" className="text-white rounded-full bg-black/20 backdrop-blur-md">
            <Satellite size={18} />
          </Button>
          <Button onClick={() => setActiveTab('profile')} size="icon" variant="ghost" className="text-white rounded-full bg-black/20 backdrop-blur-md overflow-hidden">
            <User size={18} />
          </Button>
        </div>
      </header>

      {/* Main Map View */}
      <main className="flex-1 relative">
         {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={passengerLocation}
                zoom={16}
                mapTypeId={mapTypeId}
                options={{
                  disableDefaultUI: true,
                  styles: MAP_DARK_STYLE
                }}
                onLoad={(map) => { mapRef.current = map; }}
              >
                {/* User Current Location (Blue Dot) */}
                <Marker position={passengerLocation} icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#3B82F6",
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#FFFFFF",
                }} />

                {!currentRide && availableDrivers?.map((d: any) => (
                  <Marker 
                    key={d.driverId}
                    position={d.currentLocation}
                    icon={{ url: d.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 35, height: 35 } as any }}
                  />
                ))}
                
                {currentRide && driverData?.currentLocation && (
                  <Marker 
                    position={driverData.currentLocation}
                    icon={{ url: currentRide.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 45, height: 45 } as any }}
                  />
                )}
                
                {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#22C55E', strokeWeight: 5 } }} />}
              </GoogleMap>
          ) : <div className="size-full bg-slate-900 animate-pulse" />}
          
          <Button onClick={() => mapRef.current?.panTo(passengerLocation)} size="icon" className="absolute bottom-[40%] right-6 z-20 rounded-full bg-white shadow-xl text-[#0F172A] hover:bg-slate-100">
            <LocateFixed size={20} />
          </Button>
      </main>

      {/* Floating Bottom Panel */}
      <div className="absolute bottom-0 inset-x-0 z-40">
        
        {/* Navigation Tabs (Mobile Only) */}
        {!currentRide && !showOptions && (
          <div className="flex justify-center gap-4 mb-4">
              {['home', 'history', 'profile'].map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab as any)}
                    className={`h-12 px-6 rounded-full backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-secondary text-white border-secondary' : 'bg-black/40 text-white/40'}`}
                  >
                      {tab === 'home' ? <Navigation size={14}/> : tab === 'history' ? <History size={14}/> : <User size={14}/>}
                      {tab === 'home' ? 'UMUGENZI' : tab === 'history' ? 'Trips' : 'Konti'}
                  </button>
              ))}
          </div>
        )}

        <div className={`w-full bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-8 pb-10 transition-all duration-500 ease-in-out transform ${activeTab === 'home' ? 'translate-y-0' : 'translate-y-full h-0 opacity-0 overflow-hidden'}`}>
            
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />

            {currentRide ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-5">
                          <div className="size-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                             {currentRide.vehicleType === 'moto' ? <Bike size={36}/> : <CarIcon size={36}/>}
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentRide.status === 'requested' ? 'GUSHAKISHA...' : 'UMUSHOFERI ARI MU NZIRA'}</p>
                             <h3 className="text-xl font-black uppercase text-[#0F172A]">{currentRide.driverName || '---'}</h3>
                             {driverData?.plateNumber && <Badge className="bg-accent text-accent-foreground font-black italic mt-1">{driverData.plateNumber}</Badge>}
                          </div>
                       </div>
                       <Button variant="outline" size="icon" onClick={cancelRide} className="rounded-2xl text-red-500 border-red-100 bg-red-50"><X size={20}/></Button>
                    </div>

                    {currentRide.status === 'requested' ? (
                       <div className="p-10 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 space-y-4">
                          <div className="flex justify-center gap-2">
                             <div className="size-2 bg-secondary rounded-full animate-bounce" />
                             <div className="size-2 bg-secondary rounded-full animate-bounce [animation-delay:0.2s]" />
                             <div className="size-2 bg-secondary rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                          <p className="font-bold text-sm text-slate-500 uppercase tracking-widest">Turagushakira umumotari uri hafi...</p>
                       </div>
                    ) : (
                       <div className="space-y-4">
                          {distance && <div className="p-4 rounded-2xl bg-secondary/5 text-secondary text-center text-xs font-black uppercase tracking-widest border border-secondary/10">Uruhetse ruri mu ntera ya {distance}</div>}
                          <div className="flex gap-4">
                              <a href={`tel:${currentRide.driverPhone}`} className="flex-1 h-14 rounded-2xl bg-secondary text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:shadow-secondary/20 transition-all"><Phone size={20}/> HAMAGARA</a>
                              <Button className="flex-1 h-14 rounded-2xl bg-[#0F172A] text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg"><MessageSquare size={20}/> TEXT</Button>
                          </div>
                       </div>
                    )}
                </div>
            ) : showOptions ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-black italic tracking-tighter uppercase text-[#0F172A]">Hitamo ubwoko</h2>
                        <Button variant="ghost" onClick={() => setShowOptions(false)} className="rounded-xl"><X size={18}/></Button>
                    </div>
                    <div className="grid gap-4">
                       <button onClick={() => handleQuickRequest('moto')} className="group flex items-center justify-between p-6 rounded-3xl bg-secondary/5 border-2 border-secondary/10 hover:border-secondary/50 transition-all">
                          <div className="flex items-center gap-5">
                             <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center text-white">
                                <Bike size={32} />
                             </div>
                             <div className="text-left">
                                <span className="font-black uppercase text-lg text-[#0F172A] block leading-none">MOTO</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Yihuta cyane • 2-3 min</span>
                             </div>
                          </div>
                          <span className="font-black text-secondary">800 Rwf</span>
                       </button>
                       
                       <button onClick={() => handleQuickRequest('taxi')} className="group flex items-center justify-between p-6 rounded-3xl bg-accent/5 border-2 border-accent/10 hover:border-accent/50 transition-all">
                          <div className="flex items-center gap-5">
                             <div className="size-14 rounded-2xl bg-accent flex items-center justify-center text-accent-foreground">
                                <CarIcon size={32} />
                             </div>
                             <div className="text-left">
                                <span className="font-black uppercase text-lg text-[#0F172A] block leading-none">TAXI</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Umutekano • 5 min</span>
                             </div>
                          </div>
                          <span className="font-black text-accent-foreground">2,500 Rwf</span>
                       </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-[#0F172A] leading-none">Smart Travel</h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Wizere Mutambuke ku ngendo zawe</p>
                    </div>

                    <div className="space-y-4">
                       <div className="relative group">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary">
                             <Navigation size={18} fill="currentColor" className="opacity-20"/>
                          </div>
                          <Input 
                            readOnly
                            value="Aho uherereye (GPS)"
                            className="h-16 pl-14 rounded-2xl bg-slate-50 border-none font-bold text-slate-500 cursor-default"
                          />
                       </div>

                       <div className="relative group">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0F172A] transition-colors">
                             <MapPin size={18}/>
                          </div>
                          <Input 
                            placeholder="Aho ujya..."
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="h-16 pl-14 rounded-2xl bg-slate-50 border-none font-bold text-[#0F172A] focus-visible:ring-2 focus-visible:ring-secondary/20"
                          />
                       </div>

                       <Button 
                        onClick={() => setShowOptions(true)}
                        className="w-full h-16 rounded-2xl bg-secondary hover:bg-secondary/90 text-white text-lg font-black italic uppercase tracking-widest shadow-xl shadow-secondary/20 transition-all active:scale-95"
                       >
                          SHAKA URUGENDO <ArrowRight size={20} className="ml-2"/>
                       </Button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* History & Profile Modals (Full screen overlays) */}
      {(activeTab === 'history' || activeTab === 'profile') && (
         <div className="fixed inset-0 z-[60] bg-white animate-in slide-in-from-bottom duration-500 overflow-y-auto">
            <header className="h-20 flex items-center justify-between px-8 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-xl z-10">
               <h2 className="text-2xl font-black uppercase tracking-tighter italic text-[#0F172A]">{activeTab === 'history' ? 'IBYATAMBUTSE' : 'UMWIRONDORO'}</h2>
               <Button onClick={() => setActiveTab('home')} variant="ghost" className="rounded-2xl bg-slate-50 text-[#0F172A] font-black uppercase text-[10px] tracking-widest"><X size={16} className="mr-2"/> FUNGA</Button>
            </header>

            <div className="p-8 pb-32">
               {activeTab === 'history' ? (
                  <div className="max-w-md mx-auto space-y-4">
                      {rideHistory?.map((ride: any) => (
                          <Card key={ride.rideId} className="p-6 rounded-[2rem] border-none bg-slate-50 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-4">
                                      <div className={`size-12 rounded-2xl flex items-center justify-center ${ride.vehicleType === 'moto' ? 'bg-secondary/10 text-secondary' : 'bg-accent/10 text-accent-foreground'}`}>
                                          {ride.vehicleType === 'moto' ? <Bike size={24}/> : <CarIcon size={24}/>}
                                      </div>
                                      <div>
                                          <p className="font-black text-sm uppercase text-[#0F172A]">{ride.driverName || 'N/A'}</p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                             <Clock size={10} className="text-slate-400"/>
                                             <p className="text-[9px] font-bold text-slate-400 uppercase">{ride.createdAt?.toDate ? format(ride.createdAt.toDate(), 'PPP p') : 'Unknown'}</p>
                                          </div>
                                      </div>
                                  </div>
                                  <Badge className="bg-secondary/10 text-secondary border-none uppercase text-[8px] font-black tracking-widest">YARANGIYE</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 border-t border-slate-200/50 pt-4">
                                 <MapPin size={12}/> {ride.destination}
                              </div>
                          </Card>
                      ))}
                      {!rideHistory?.length && <div className="py-32 text-center opacity-20"><Frown size={64} className="mx-auto mb-4 text-[#0F172A]"/> <p className="font-black uppercase text-xs tracking-widest text-[#0F172A]">Nta mateka y'ingendo ahari</p></div>}
                  </div>
               ) : (
                  <div className="max-w-md mx-auto space-y-6">
                      <div className="text-center mb-10 py-10 rounded-[3rem] bg-slate-50 relative overflow-hidden">
                         <div className="size-28 mx-auto rounded-[2.5rem] bg-secondary flex items-center justify-center text-white mb-6 shadow-2xl relative z-10">
                            <UserCircle size={80}/>
                         </div>
                         <h2 className="text-3xl font-black uppercase tracking-tighter text-[#0F172A] relative z-10">{userProfile?.name}</h2>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em] mt-2 relative z-10">{userProfile?.phone}</p>
                         <div className="absolute top-0 right-0 size-40 bg-secondary/5 rounded-full -mr-20 -mt-20" />
                      </div>
                      
                      <div className="grid gap-4">
                         <ProfileItem icon={Mail} label="Email Address" value={userProfile?.email} />
                         <ProfileItem icon={ShieldCheck} label="Account Type" value={userProfile?.role} />
                         <ProfileItem icon={History} label="Total Completed Rides" value={rideHistory?.length || 0} />
                      </div>

                      <Button onClick={handleLogout} className="w-full h-16 rounded-[2rem] bg-red-50 text-red-500 border-2 border-red-100 text-sm font-black uppercase tracking-widest shadow-lg mt-10 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3">
                         <LogOut size={20}/> GUSOHOKA
                      </Button>
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
}

function ProfileItem({ icon: Icon, label, value }: any) {
  return (
    <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center gap-5 shadow-sm">
       <div className="size-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
          <Icon size={22}/>
       </div>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="font-black text-sm mt-1 text-[#0F172A]">{value || '---'}</p>
       </div>
    </div>
  );
}
