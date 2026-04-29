'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  MapPin, User, LogOut, Loader2, Navigation, Bike, Car as CarIcon,
  Menu, X, Star, Phone, ShieldCheck, Map as MapIcon,
  Mail, History, UserCircle, Search, Compass, Satellite,
  Sun, Moon, ArrowRight, Frown, MessageSquare, Send, LocateFixed
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp, updateDoc, addDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

const animStyles = `
@keyframes orbDrift { 0%,100%{transform:translate(0,0)} 33%{transform:translate(25px,-35px)} 66%{transform:translate(-18px,28px)} }
@keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
.anim-fade-up { animation:fadeUp .55s cubic-bezier(.22,1,.36,1) forwards }
.chat-bubble { border-radius: 1.2rem; padding: 0.8rem 1rem; max-width: 80%; word-break: break-word; }
`;

export default function PassengerDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'history' | 'chat'>('home');
  const [isRequesting, setIsRequesting] = useState(false);
  const [passengerLocation, setPassengerLocation] = useState(kigaliCenter);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNightMode, setIsNightMode] = useState(true);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [mapHeading, setMapHeading] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  
  const mapRef = useRef<any>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const { data: userProfile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);

  // Get active ride
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

  // Get driver location if accepted
  const { data: driverData } = useDoc(currentRide?.driverId ? `drivers/${currentRide.driverId}` : null);

  const ridersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'drivers'),
      where('status', '==', 'online'),
      where('verificationStatus', '==', 'approved')
    );
  }, [db]);
  const { data: availableDrivers, loading: driversLoading } = useCollection(ridersQuery);

  // Chat messages
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
          // Update location in active ride for driver to see
          if (db && currentRide && currentRide.status !== 'requested') {
            updateDoc(doc(db, 'rides', currentRide.rideId), { passengerLocation: loc });
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [db, currentRide]);

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
        destination: null,
        status: 'requested',
        vehicleType: type,
        createdAt: serverTimestamp()
      });
      toast({ title: t.searching, description: "Tugushakiye umushoferi..." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ikosa", description: e.message });
    } finally {
      setIsRequesting(false);
    }
  }

  async function sendMessage() {
    if (!db || !currentRide || !chatMessage.trim()) return;
    const msg = chatMessage;
    setChatMessage('');
    await addDoc(collection(db, 'rides', currentRide.rideId, 'messages'), {
      text: msg,
      senderId: user?.uid,
      senderName: userProfile?.name,
      createdAt: serverTimestamp()
    });
  }

  const rotateMap = () => {
    setMapHeading((prev) => (prev + 90) % 360);
  };

  if (authLoading || profileLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#0F172A]">
        <Loader2 className="size-10 animate-spin text-secondary" />
    </div>
  );

  const themeClass = isNightMode ? "bg-[#0F172A] text-white" : "bg-slate-50 text-slate-900";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animStyles }} />
      <div className={`min-h-screen ${themeClass} font-sans overflow-x-hidden relative transition-colors duration-300`}>
        
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <header className={`sticky top-0 z-50 backdrop-blur-xl ${isNightMode ? 'bg-[#0F172A]/80' : 'bg-white/80'} border-b ${isNightMode ? 'border-white/[0.04]' : 'border-slate-200'}`}>
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
                <div className="relative w-9 h-9 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                  {logo ? <Image src={logo.imageUrl} alt="Logo" fill className="object-cover" /> : <span className="text-white font-black">M</span>}
                </div>
                <span className="font-black text-lg tracking-tighter uppercase">MUTAMBUKE</span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={rotateMap} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isNightMode ? 'bg-white/5' : 'bg-black/5'}`}>
                   <LocateFixed size={16} />
                </button>
                <button onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'hybrid' : mapTypeId === 'hybrid' ? 'satellite' : 'roadmap')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isNightMode ? 'bg-white/5' : 'bg-black/5'}`}>
                   <Satellite size={16} />
                </button>
                <button onClick={() => setIsNightMode(!isNightMode)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all text-accent ${isNightMode ? 'bg-white/5' : 'bg-black/5'}`}>
                  {isNightMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button onClick={() => setIsMenuOpen(true)} className={`md:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isNightMode ? 'bg-white/5' : 'bg-black/5'}`}>
                  <Menu size={18} />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-6xl w-full mx-auto px-4 pb-8 pt-5">
            {activeTab === 'home' && (
              <div className="space-y-5 anim-fade-up">
                <div className={`relative h-[350px] md:h-[500px] rounded-3xl overflow-hidden border ${isNightMode ? 'border-white/[0.06]' : 'border-slate-200'} shadow-2xl`}>
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={passengerLocation}
                      zoom={16}
                      heading={mapHeading}
                      mapTypeId={mapTypeId}
                      options={{ 
                        disableDefaultUI: true, 
                        styles: isNightMode ? [{featureType:"all",elementType:"all",stylers:[{invert_lightness:!0},{saturation:10},{lightness:30},{gamma:.9},{hue:"#435158"}]}] : [],
                        rotateControl: true,
                        tilt: 45
                      }}
                      onLoad={(map) => { mapRef.current = map; }}
                    >
                      {/* Passenger Marker */}
                      <Marker 
                        position={passengerLocation} 
                        icon={{ url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', scaledSize: { width: 40, height: 40 } as any }} 
                        label="Me"
                      />

                      {/* Nearby Drivers */}
                      {!currentRide && availableDrivers?.map((d: any) => (
                        <Marker 
                          key={d.driverId}
                          position={d.currentLocation}
                          icon={{ url: d.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 35, height: 35 } as any }}
                        />
                      ))}

                      {/* Active Driver Tracking */}
                      {currentRide && driverData?.currentLocation && (
                        <>
                          <Marker 
                            position={driverData.currentLocation}
                            icon={{ url: currentRide.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 45, height: 45 } as any }}
                          />
                          <InfoWindow position={driverData.currentLocation}>
                            <div className="text-[10px] font-bold text-slate-900">{driverData.plateNumber}</div>
                          </InfoWindow>
                        </>
                      )}
                    </GoogleMap>
                  ) : <div className="h-full w-full bg-slate-500/10 animate-pulse" />}
                  
                  {/* Floating Ride Info */}
                  {currentRide && (
                    <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                          {currentRide.vehicleType === 'moto' ? <Bike size={20}/> : <CarIcon size={20}/>}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{currentRide.status === 'requested' ? 'Gushakisha...' : 'Umushoferi ari mu nzira'}</p>
                          <p className="font-bold text-slate-900">{currentRide.driverName || 'Tegereza...'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {currentRide.status !== 'requested' && (
                          <Button size="icon" onClick={() => setActiveTab('chat')} className="rounded-xl bg-accent text-accent-foreground"><MessageSquare size={18}/></Button>
                        )}
                        <Button size="icon" variant="outline" className="rounded-xl text-red-500 border-red-100"><X size={18}/></Button>
                      </div>
                    </div>
                  )}
                </div>

                {!currentRide && (
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleQuickRequest('moto')} disabled={isRequesting} className="h-32 rounded-[2rem] bg-secondary/10 border-2 border-secondary/20 text-secondary transition-all flex flex-col items-center justify-center gap-3 active:scale-95 disabled:opacity-50 group hover:bg-secondary/20 shadow-lg">
                      <Bike size={40} className="group-hover:scale-110 transition-transform" />
                      <span className="font-black uppercase text-xs tracking-widest">SABA MOTO</span>
                    </button>
                    <button onClick={() => handleQuickRequest('taxi')} disabled={isRequesting} className="h-32 rounded-[2rem] bg-accent/10 border-2 border-accent/20 text-accent transition-all flex flex-col items-center justify-center gap-3 active:scale-95 disabled:opacity-50 group hover:bg-accent/20 shadow-lg">
                      <CarIcon size={40} className="group-hover:scale-110 transition-transform" />
                      <span className="font-black uppercase text-xs tracking-widest">SABA TAXI</span>
                    </button>
                  </div>
                )}

                <div className="space-y-4 pt-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 px-2">Abashoferi bari hafi yawe</h3>
                  <div className="grid gap-3">
                    {driversLoading ? <Loader2 className="animate-spin mx-auto opacity-20"/> : (
                      availableDrivers?.length ? availableDrivers.map((d: any) => (
                        <div key={d.driverId} className={`p-5 rounded-[2rem] flex items-center gap-4 border transition-all ${isNightMode ? 'bg-white/5 border-white/5 hover:bg-white/[0.08]' : 'bg-white border-slate-100 shadow-sm'}`}>
                          <div className={`size-14 rounded-2xl flex items-center justify-center ${isNightMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                            {d.vehicleType === 'moto' ? <Bike className="text-secondary"/> : <CarIcon className="text-accent"/>}
                          </div>
                          <div className="flex-1">
                            <p className="font-black uppercase text-sm tracking-tight">{d.name || 'Umushoferi'}</p>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
                              <span className="flex items-center gap-1 text-accent"><Star size={10} className="fill-accent"/> { (d.rating || 4.5).toFixed(1) }</span>
                              <span>• {d.plateNumber}</span>
                            </div>
                          </div>
                          <a href={`tel:${d.phone || ''}`} className="size-12 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-xl active:scale-90 transition-all">
                              <Phone size={20} />
                          </a>
                        </div>
                      )) : (
                        <div className="py-10 text-center opacity-20"><Frown className="mx-auto mb-2"/> <p className="text-xs font-bold uppercase">Nta mushoferi uhari</p></div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && currentRide && (
              <div className="flex flex-col h-[600px] anim-fade-up">
                <header className="p-4 border-b border-white/10 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" onClick={() => setActiveTab('home')}><ArrowRight className="rotate-180"/></Button>
                      <h3 className="font-black uppercase text-sm">{currentRide.driverName}</h3>
                   </div>
                   <a href={`tel:${currentRide.driverPhone}`} className="text-secondary"><Phone size={20}/></a>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                  {messages?.map((m: any) => (
                    <div key={m.id} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className={`chat-bubble ${m.senderId === user?.uid ? 'bg-secondary text-white' : 'bg-white/10 text-white'}`}>
                        <p className="text-sm font-bold leading-relaxed">{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 flex gap-2">
                  <Input 
                    value={chatMessage} 
                    onChange={(e) => setChatMessage(e.target.value)} 
                    placeholder="Andika ubutumwa..." 
                    className="rounded-2xl h-14 bg-white/5 border-white/10 text-white"
                  />
                  <Button onClick={sendMessage} className="size-14 rounded-2xl bg-secondary text-white"><Send size={20}/></Button>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6 anim-fade-up">
                <div className={`p-8 rounded-[3rem] border ${isNightMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-xl'} text-center`}>
                  <div className="size-24 mx-auto rounded-3xl bg-secondary/10 flex items-center justify-center text-secondary mb-4">
                    <UserCircle size={64}/>
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">{userProfile?.name || 'Umugenzi'}</h2>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-[0.3em] mt-2">{userProfile?.phone}</p>
                </div>

                <div className="grid gap-4">
                    <ProfileCard icon={Mail} label="Imeyili" value={userProfile?.email} isNight={isNightMode} />
                    <ProfileCard icon={ShieldCheck} label="Uruhare" value={userProfile?.role} isNight={isNightMode} />
                </div>

                <Button onClick={() => signOut(auth!)} className="w-full h-20 rounded-[2.5rem] bg-red-500/10 text-red-500 border-2 border-red-500/10 text-lg font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all mt-10">
                  <LogOut className="mr-3" size={24}/> GUSOHOKA
                </Button>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="py-20 text-center space-y-4 anim-fade-up">
                <History size={60} className="mx-auto opacity-10" />
                <h3 className="text-xl font-black uppercase tracking-tighter">Amateka Nta Arimo</h3>
                <p className="text-xs font-bold text-white/20 uppercase tracking-widest">Ingendo zawe zizagaragara hano mu byiciro.</p>
              </div>
            )}
          </main>

          {/* Bottom Nav */}
          <nav className={`md:hidden sticky bottom-0 z-50 ${isNightMode ? 'bg-[#0F172A]/90' : 'bg-white/90'} backdrop-blur-xl border-t ${isNightMode ? 'border-white/[0.04]' : 'border-slate-200'} flex justify-around py-3`}>
            {[
              { id: 'home' as const, icon: Navigation, label: 'UMUGENZI' },
              { id: 'history' as const, icon: History, label: 'IBYATAMBUTSE' },
              { id: 'profile' as const, icon: UserCircle, label: 'UMWIRONDORO' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === item.id ? 'text-secondary' : 'opacity-30'}`}>
                <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                <span className="text-[8px] font-black uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
            <div className="fixed inset-0 z-[100] flex md:hidden" onClick={() => setIsMenuOpen(false)}>
              <div className="bg-black/80 flex-1" />
              <div className={`w-80 p-8 flex flex-col gap-6 shadow-2xl ${isNightMode ? 'bg-[#0F172A]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <span className="font-black italic uppercase text-lg tracking-tighter">MUTAMBUKE</span>
                    <button onClick={() => setIsMenuOpen(false)}><X/></button>
                </div>
                <nav className="flex flex-col gap-3 mt-8">
                  {[
                    { id: 'home' as const, label: 'UMUGENZI' },
                    { id: 'history' as const, label: 'IBYATAMBUTSE' },
                    { id: 'profile' as const, label: 'UMWIRONDORO' }
                  ].map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }} className={`p-4 rounded-2xl font-black text-left uppercase text-xs tracking-widest transition-all ${activeTab === item.id ? 'bg-secondary/10 text-secondary' : 'hover:bg-white/5'}`}>{item.label}</button>
                  ))}
                </nav>
                <div className="mt-auto">
                    <Button onClick={() => {signOut(auth!); setIsMenuOpen(false);}} className="w-full h-16 rounded-2xl bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-xs">
                        <LogOut size={16} className="mr-2" /> GUSOHOKA
                    </Button>
                </div>
              </div>
            </div>
        )}
      </div>
    </>
  );
}

function ProfileCard({ icon: Icon, label, value, isNight }: any) {
  return (
    <div className={`p-6 rounded-[2.5rem] flex items-center gap-5 border transition-all ${isNight ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-lg'}`}>
      <div className="size-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{label}</p>
        <p className="font-bold text-sm mt-0.5">{value || 'N/A'}</p>
      </div>
    </div>
  );
}
