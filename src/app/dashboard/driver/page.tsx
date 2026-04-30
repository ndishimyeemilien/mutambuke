'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Bike, 
  Car, 
  LogOut, 
  Navigation, 
  User, 
  Phone, 
  Star, 
  Loader2, 
  ShieldCheck, 
  MapPin, 
  MessageSquare, 
  Send, 
  X, 
  History, 
  UserCircle, 
  Wallet,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { collection, doc, updateDoc, query, where, serverTimestamp, addDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const containerStyle = { width: "100%", height: "100%" };
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "feature": "administrative", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
  { "feature": "poi", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "feature": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#334155" }] },
  { "feature": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "feature": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] }
];

export default function DriverDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [location, setLocation] = useState(kigaliCenter);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [activeView, setActiveView] = useState<'map' | 'profile' | 'history' | 'earnings'>('map');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const { data: profile } = useDoc(user ? `users/${user.uid}` : null);
  const { data: driver, loading: dLoading } = useDoc(user ? `drivers/${user.uid}` : null);

  const status = driver?.status || 'offline';
  const isOnline = status === 'online';
  const isBusy = status === 'busy';
  const isApproved = driver?.verificationStatus === 'approved';
  const vehicleType = driver?.vehicleType || 'moto';

  // Real-time ride requests
  const requestsQuery = useMemoFirebase(() => {
    if (!db || !isOnline || !isApproved) return null;
    return query(
      collection(db, 'rides'), 
      where('status', '==', 'requested'), 
      where('vehicleType', '==', vehicleType),
      limit(1)
    );
  }, [db, isOnline, isApproved, vehicleType]);
  const { data: requests } = useCollection(requestsQuery);
  const pendingRequest = requests?.[0];

  // Active trip
  const activeQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'rides'), where('driverId', '==', user.uid), where('status', 'in', ['accepted', 'started', 'arrived']));
  }, [db, user]);
  const { data: activeRides } = useCollection(activeQuery);
  const currentRide = activeRides?.[0];

  // Chat
  const chatQuery = useMemoFirebase(() => {
    if (!db || !currentRide) return null;
    return query(collection(db, 'rides', currentRide.rideId, 'messages'), orderBy('createdAt', 'asc'));
  }, [db, currentRide]);
  const { data: messages } = useCollection(chatQuery);

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          if (db && user && (isOnline || isBusy)) {
            updateDoc(doc(db, 'drivers', user.uid), { currentLocation: newLoc, updatedAt: serverTimestamp() }).catch(() => {});
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [db, user, isOnline, isBusy]);

  useEffect(() => {
    if (isLoaded && currentRide && location) {
      const destination = currentRide.status === 'started' ? (currentRide.destinationLocation || currentRide.pickupLocation) : currentRide.pickupLocation;
      if (!destination) return;

      const service = new google.maps.DirectionsService();
      service.route(
        {
          origin: location,
          destination: destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result) {
            setDirections(result);
            setDistance(result.routes[0].legs[0].distance?.text || null);
            setEta(result.routes[0].legs[0].duration?.text || null);
          }
        }
      );
    } else {
      setDirections(null);
      setDistance(null);
      setEta(null);
    }
  }, [isLoaded, currentRide, location]);

  async function toggleStatus() {
    if (!db || !user || !isApproved || isBusy) return;
    const newStatus = isOnline ? 'offline' : 'online';
    await updateDoc(doc(db, 'drivers', user.uid), { status: newStatus, updatedAt: serverTimestamp() });
  }

  async function acceptRide(rideId: string) {
    if (!db || !user) return;
    await updateDoc(doc(db, 'rides', rideId), {
      status: 'accepted',
      driverId: user.uid,
      driverName: profile?.name || 'Driver',
      driverPhone: profile?.phone || '',
      acceptedAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'drivers', user.uid), { status: 'busy', updatedAt: serverTimestamp() });
  }

  async function updateRideStatus(status: 'arrived' | 'started' | 'completed') {
    if (!db || !currentRide || !user) return;
    const rideRef = doc(db, 'rides', currentRide.rideId);
    const driverRef = doc(db, 'drivers', user.uid);
    
    if (status === 'completed') {
      await updateDoc(rideRef, { status, completedAt: serverTimestamp() });
      await updateDoc(driverRef, { status: 'online' });
    } else {
      await updateDoc(rideRef, { status });
    }
  }

  async function sendMessage(text?: string) {
    const msg = text || chatMessage;
    if (!db || !currentRide || !msg.trim()) return;
    setChatMessage('');
    await addDoc(collection(db, 'rides', currentRide.rideId, 'messages'), {
      text: msg,
      senderId: user?.uid,
      senderName: profile?.name || 'Driver',
      createdAt: serverTimestamp()
    });
  }

  if (dLoading) return <div className="h-screen flex items-center justify-center bg-[#0F172A]"><Loader2 className="animate-spin text-secondary size-10" /></div>;
  
  if (!isApproved) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0F172A] text-white p-10 text-center">
        <ShieldCheck className="size-20 text-accent mb-6 animate-pulse"/>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 italic text-accent">KONTI IRAGENZURWA</h1>
        <p className="text-white/40 max-w-md font-bold text-sm uppercase tracking-widest leading-relaxed">Genzura amakuru yawe arimo kurangira. Murakoze kwihangana mu gihe MUTAMBUKE irimo kwemeza ibyangombwa byanyu.</p>
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col bg-[#0F172A] text-white font-body">
      
      {activeView === 'map' && (
        <>
          {isLoaded ? (
            <GoogleMap 
              mapContainerStyle={containerStyle} 
              center={location} 
              zoom={16} 
              options={{ 
                disableDefaultUI: true, 
                styles: DARK_MAP_STYLE 
              }}
            >
              <Marker 
                position={location} 
                icon={{ 
                  url: vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', 
                  scaledSize: { width: 45, height: 45 } as any 
                }} 
              />
              
              {currentRide && (
                <Marker 
                  position={currentRide.status === 'started' ? (currentRide.destinationLocation || currentRide.pickupLocation) : currentRide.pickupLocation} 
                  icon={{ url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', scaledSize: { width: 35, height: 35 } as any }} 
                />
              )}

              {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#22C55E', strokeWeight: 6 } }} />}
            </GoogleMap>
          ) : <div className="h-full w-full bg-[#0F172A] flex items-center justify-center"><Loader2 className="animate-spin text-secondary"/></div>}
          
          {/* TOP BAR: Status & Earnings */}
          <div className="absolute top-4 inset-x-4 z-20">
            <div className="max-w-md mx-auto flex items-center gap-3">
               <div className={`flex-1 h-14 rounded-full backdrop-blur-xl border border-white/10 flex items-center justify-between px-6 transition-all ${isOnline ? 'bg-secondary/20 border-secondary/40' : 'bg-black/60'}`}>
                  <div className="flex items-center gap-3">
                     <div className={`size-3 rounded-full animate-pulse ${isOnline ? 'bg-secondary shadow-[0_0_10px_#22C55E]' : 'bg-red-500'}`} />
                     <p className="text-[10px] font-black uppercase tracking-widest">{isOnline ? 'URI ONLINE' : 'URI OFFLINE'}</p>
                  </div>
                  <Switch checked={isOnline} onCheckedChange={toggleStatus} disabled={isBusy} className="data-[state=checked]:bg-secondary" />
               </div>
               <div className="h-14 aspect-square rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-accent relative shadow-2xl">
                  <Wallet size={20} />
                  <div className="absolute -top-1 -right-1 bg-red-500 text-[8px] font-black px-1.5 py-0.5 rounded-full">2</div>
               </div>
            </div>
            
            {/* Earnings Quick View */}
            <div className="max-w-md mx-auto mt-2 grid grid-cols-2 gap-2">
                <Card className="bg-black/60 backdrop-blur-xl border-white/5 p-3 rounded-2xl flex items-center justify-between shadow-2xl">
                    <div>
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Inyungu</p>
                        <p className="text-sm font-black text-secondary uppercase">8,400 Rwf</p>
                    </div>
                    <Star className="text-accent" size={14} />
                </Card>
                <Card className="bg-black/60 backdrop-blur-xl border-white/5 p-3 rounded-2xl flex items-center justify-between shadow-2xl">
                    <div>
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Ingendo</p>
                        <p className="text-sm font-black text-white uppercase">12 Trips</p>
                    </div>
                    <CheckCircle2 className="text-blue-400" size={14} />
                </Card>
            </div>
          </div>

          {/* EMERGENCY / SOS */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
              <Button size="icon" className="size-12 rounded-2xl bg-red-500/20 text-red-500 border border-red-500/20 shadow-2xl backdrop-blur-md">
                 <AlertTriangle size={24} />
              </Button>
              <Button onClick={() => setActiveView('profile')} size="icon" className="size-12 rounded-2xl bg-black/60 text-white border border-white/10 shadow-2xl backdrop-blur-md">
                 <UserCircle size={24} />
              </Button>
          </div>

          {/* BOTTOM PANEL */}
          <div className="absolute bottom-6 inset-x-6 z-20">
             <div className="max-w-md mx-auto space-y-4">
                
                {pendingRequest && !currentRide && (
                  <Card className="bg-black/90 backdrop-blur-2xl border-secondary/30 rounded-[2.5rem] p-6 text-white shadow-2xl animate-in slide-in-from-bottom-5">
                      <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-4">
                            <div className="size-14 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary relative">
                               <User size={30} />
                               <div className="absolute -bottom-1 -right-1 size-6 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-black text-[10px]">4.9</div>
                            </div>
                            <div>
                               <h3 className="text-xl font-black uppercase tracking-tight leading-none">{pendingRequest.passengerName}</h3>
                               <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                  <MapPin size={10} className="text-secondary"/> hafi yawe
                               </p>
                            </div>
                         </div>
                         <div className="text-right">
                             <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Igiciro</p>
                             <p className="text-lg font-black text-accent italic">1,200 <span className="text-[10px]">Rwf</span></p>
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                         <Button variant="ghost" className="h-16 rounded-2xl bg-white/5 border border-white/5 font-black uppercase text-xs tracking-widest text-white/40 hover:bg-white/10">REJECT</Button>
                         <Button onClick={() => acceptRide(pendingRequest.rideId)} className="h-16 rounded-2xl bg-secondary text-[#0F172A] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-secondary/20">ACCEPT TRIP</Button>
                      </div>
                  </Card>
                )}

                {currentRide && (
                  <div className="space-y-4">
                     {showChat ? (
                        <Card className="bg-black/90 backdrop-blur-3xl border-white/10 rounded-[2.5rem] p-4 h-[450px] flex flex-col text-white shadow-2xl">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <div className="flex items-center gap-3">
                                   <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="rounded-xl bg-white/5"><ArrowRight className="rotate-180" size={18}/></Button>
                                   <h3 className="font-black uppercase text-xs tracking-widest">{currentRide.passengerName}</h3>
                                </div>
                                <a href={`tel:${currentRide.passengerPhone}`} className="size-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center"><Phone size={18}/></a>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 px-2 py-4 no-scrollbar">
                               {messages?.map((m: any) => (
                                 <div key={m.id} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-4 rounded-[1.5rem] max-w-[85%] text-xs font-bold ${m.senderId === user?.uid ? 'bg-secondary text-[#0F172A] rounded-tr-none' : 'bg-white/10 rounded-tl-none'}`}>
                                       {m.text}
                                    </div>
                                 </div>
                               ))}
                            </div>
                            <div className="p-2 space-y-3">
                               <div className="flex gap-2">
                                   <Input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Andika..." className="bg-white/5 border-none h-14 rounded-2xl text-xs font-bold px-6" />
                                   <Button onClick={() => sendMessage()} size="icon" className="bg-secondary text-[#0F172A] rounded-2xl h-14 w-14 shadow-xl"><Send size={20}/></Button>
                               </div>
                            </div>
                        </Card>
                     ) : (
                        <Card className="rounded-[2.5rem] border-white/10 bg-black/80 backdrop-blur-2xl p-6 text-white shadow-2xl relative">
                           <div className="absolute top-0 right-0 p-4">
                              <Badge className="bg-blue-500/20 text-blue-400 border-none font-black italic text-[8px] tracking-widest">
                                 {currentRide.status.toUpperCase()}
                              </Badge>
                           </div>
                           <div className="flex items-center gap-5 mb-8">
                              <div className="size-16 rounded-3xl bg-secondary/10 flex items-center justify-center text-secondary">
                                 <UserCircle size={45} strokeWidth={1}/>
                              </div>
                              <div className="flex-1">
                                 <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Umugenzi</p>
                                 <h3 className="text-2xl font-black uppercase tracking-tight">{currentRide.passengerName}</h3>
                                 {distance && <p className="text-[9px] font-black text-secondary uppercase tracking-widest mt-1 flex items-center gap-1"><Clock size={10}/> {eta} ({distance})</p>}
                              </div>
                              <div className="flex gap-2">
                                 <Button onClick={() => setShowChat(true)} size="icon" className="size-12 rounded-2xl bg-accent/20 text-accent border border-accent/20"><MessageSquare size={22}/></Button>
                                 <a href={`tel:${currentRide.passengerPhone}`} className="size-12 rounded-2xl bg-secondary text-[#0F172A] flex items-center justify-center shadow-lg"><Phone size={22} /></a>
                              </div>
                           </div>
                           <div className="space-y-3">
                              {currentRide.status === 'accepted' && (
                                <Button onClick={() => updateRideStatus('arrived')} className="w-full h-16 rounded-2xl bg-white text-[#0F172A] font-black text-lg uppercase tracking-widest shadow-2xl italic">NAGEZE AHO URI</Button>
                              )}
                              {currentRide.status === 'arrived' && (
                                <Button onClick={() => updateRideStatus('started')} className="w-full h-16 rounded-2xl bg-secondary text-[#0F172A] font-black text-lg uppercase tracking-widest shadow-2xl italic">TANGIRA URUGENDO</Button>
                              )}
                              {currentRide.status === 'started' && (
                                <Button onClick={() => updateRideStatus('completed')} className="w-full h-16 rounded-2xl bg-accent text-[#0F172A] font-black text-lg uppercase tracking-widest shadow-2xl italic">SOZA URUGENDO</Button>
                              )}
                           </div>
                        </Card>
                     )}
                  </div>
                )}

                {!currentRide && !pendingRequest && (
                  <div className="bg-black/60 backdrop-blur-xl p-10 rounded-[3rem] text-center space-y-5 border border-white/5 shadow-2xl">
                    <div className="relative size-20 mx-auto">
                        <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isOnline ? 'bg-secondary' : 'bg-red-500'}`} />
                        <div className={`size-full rounded-full flex items-center justify-center ${isOnline ? 'bg-secondary/10 text-secondary' : 'bg-red-500/10 text-red-500'}`}>
                           <Navigation size={40} className={isOnline ? 'animate-bounce' : ''} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic">{isOnline ? 'Gushaka abagenzi...' : 'Nturi ku kazi'}</h2>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mt-2 leading-relaxed">
                           {isOnline ? 'Uri ku kazi, imiterere yawe iri kugaragara kuri bose.' : 'Kanda buto ya hejuru kugira ngo utangire akazi.'}
                        </p>
                    </div>
                    <div className="flex justify-center gap-2">
                        <Button onClick={() => setActiveView('history')} variant="ghost" className="h-10 px-6 rounded-full bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white">AMATEKA</Button>
                        <Button onClick={() => setActiveView('earnings')} variant="ghost" className="h-10 px-6 rounded-full bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white">INYUNGU</Button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </>
      )}

      {activeView !== 'map' && (
        <div className="fixed inset-0 z-50 bg-[#0F172A] overflow-y-auto animate-in slide-in-from-right-10 duration-500 pb-20">
           <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 sticky top-0 bg-[#0F172A]/80 backdrop-blur-xl z-10">
              <Button onClick={() => setActiveView('map')} variant="ghost" className="rounded-2xl bg-white/5 text-white font-black uppercase text-[10px] tracking-widest gap-2">
                 <ArrowRight className="rotate-180" size={16}/> NYUMA
              </Button>
              <h2 className="text-xl font-black uppercase tracking-tighter italic text-accent">{activeView === 'profile' ? 'UMWIRONDORO' : activeView === 'earnings' ? 'INYUNGU' : 'IBYATAMBUTSE'}</h2>
              <div className="size-10" />
           </header>

           <div className="max-w-md mx-auto p-6 space-y-6">
              {activeView === 'profile' && (
                <div className="space-y-6">
                   <div className="p-10 rounded-[3rem] bg-white/5 border border-white/5 text-center shadow-2xl relative overflow-hidden">
                      <div className="size-28 mx-auto rounded-[2.5rem] bg-accent/20 flex items-center justify-center text-accent mb-6 shadow-xl relative z-10">
                         <User size={60} strokeWidth={1.5}/>
                      </div>
                      <h3 className="text-3xl font-black uppercase tracking-tighter">{profile?.name || 'User'}</h3>
                      <p className="text-xs font-bold text-white/30 uppercase tracking-[0.4em] mt-2">{profile?.phone}</p>
                      <div className="absolute top-0 right-0 size-40 bg-accent/5 rounded-full -mr-20 -mt-20" />
                   </div>
                   
                   <div className="grid gap-3">
                      <ProfileInfoCard icon={ShieldCheck} label="Ubwoko" value={driver?.vehicleType?.toUpperCase()} />
                      <ProfileInfoCard icon={CheckCircle2} label="Plaque" value={driver?.plateNumber} />
                      <ProfileInfoCard icon={Star} label="Rating" value="4.9 Stars" />
                      <ProfileInfoCard icon={Navigation} label="License" value={driver?.licenseNumber} />
                   </div>

                   <Button onClick={() => signOut(auth!).then(() => router.replace('/lib/auth'))} className="w-full h-16 rounded-[2rem] bg-red-500/10 text-red-500 border border-red-500/10 font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all mt-6">
                      <LogOut size={18} className="mr-3"/> GUSOHOKA
                   </Button>
                </div>
              )}

              {activeView === 'earnings' && (
                <div className="space-y-8">
                   <div className="p-10 rounded-[3rem] bg-secondary/10 border border-secondary/20 text-center relative overflow-hidden shadow-2xl">
                      <p className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] mb-4">Urubatso Rwose</p>
                      <h3 className="text-5xl font-black tracking-tighter text-white italic">42,800 <span className="text-xl">Rwf</span></h3>
                      <Button className="mt-8 h-12 rounded-2xl bg-secondary text-[#0F172A] font-black uppercase text-[10px] tracking-widest px-8">KURAHO AMAFARANGA</Button>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-white/5 border-white/5 p-6 rounded-[2.5rem] text-center">
                         <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Uyu munsi</p>
                         <p className="text-xl font-black text-accent italic">8,400 <span className="text-[10px]">Rwf</span></p>
                      </Card>
                      <Card className="bg-white/5 border-white/5 p-6 rounded-[2.5rem] text-center">
                         <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Iyi Cyumweru</p>
                         <p className="text-xl font-black text-white italic">124,500 <span className="text-[10px]">Rwf</span></p>
                      </Card>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}

function ProfileInfoCard({ icon: Icon, label, value }: any) {
  return (
    <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-between shadow-lg">
       <div className="flex items-center gap-4">
          <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
             <Icon size={20}/>
          </div>
          <div>
             <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{label}</p>
             <p className="font-black text-sm mt-0.5 uppercase">{value || '---'}</p>
          </div>
       </div>
    </div>
  );
}