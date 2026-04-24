
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bike, Mail, Lock, User, Phone, ArrowLeft, Loader2, Car, Globe } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { translations, Language } from '@/lib/translations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AuthPage() {
  const [lang, setLang] = useState<Language>('rw');
  const t = translations[lang];

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [vehicleType, setVehicleType] = useState<'moto' | 'taxi'>('moto');
  const [identifier, setIdentifier] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const auth = useAuth();
  const db = useFirestore();

  const authImage = PlaceHolderImages.find(img => img.id === 'auth-illustration');

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !db) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        let loginEmail = identifier;
        
        if (!identifier.includes('@')) {
          const q = query(collection(db, 'users'), where('phone', '==', identifier), limit(1));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            loginEmail = snapshot.docs[0].data().email;
          } else {
            throw new Error('No user found with this phone number.');
          }
        }

        await signInWithEmailAndPassword(auth, loginEmail, password);
        router.push('/');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userRole = email === 'adimini@gmail.com' ? 'admin' : role;

        const userData = {
          userId: user.uid,
          name: name,
          email: email,
          phone: phone,
          role: userRole,
          language: lang,
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', user.uid), userData);

        if (userRole === 'driver') {
          const driverData = {
            driverId: user.uid,
            status: 'offline',
            isVerified: false,
            vehicleType: vehicleType,
            updatedAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'drivers', user.uid), driverData);
        }

        router.push('/');
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 relative bg-primary overflow-hidden">
        {authImage && (
          <Image
            src={authImage.imageUrl}
            alt="Auth illustration"
            fill
            className="object-cover opacity-60 mix-blend-overlay"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-transparent flex flex-col justify-center p-20 text-white z-10">
          <Bike className="size-20 mb-8" />
          <h1 className="text-7xl font-black italic mb-6 leading-none">JOIN THE <br /> MOVEMENT.</h1>
          <p className="text-xl font-medium opacity-90 max-w-md italic">
            Connecting thousands of riders and passengers across the city every day.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-6 md:p-12 bg-white">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <Link href="/landing" className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors font-bold text-sm uppercase">
              <ArrowLeft className="size-4" /> {isLogin ? 'Home' : 'Back'}
            </Link>
            
            <Select value={lang} onValueChange={(v: Language) => setLang(v)}>
              <SelectTrigger className="w-[120px] h-10 rounded-xl bg-slate-50 border-none font-bold text-xs">
                <Globe className="size-3 mr-2" />
                <SelectValue placeholder="Lang" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="rw" className="font-bold">RWANDA</SelectItem>
                <SelectItem value="en" className="font-bold">ENGLISH</SelectItem>
                <SelectItem value="fr" className="font-bold">FRANÇAIS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h2 className="text-4xl font-black italic text-slate-900 uppercase">
              {isLogin ? t.welcome : t.createAccount}
            </h2>
            <p className="text-slate-500 font-medium">
              {isLogin ? 'Enter your details to access your dashboard' : 'Join the fastest urban transport network'}
            </p>
          </div>

          <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 bg-slate-100 p-1 mb-8">
              <TabsTrigger value="login" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase">{t.login}</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase">{t.signup}</TabsTrigger>
            </TabsList>

            <form onSubmit={handleAuth} className="space-y-4">
              <TabsContent value="login" className="space-y-4 mt-0">
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.emailOrPhone}</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input 
                      placeholder="Email or +250..." 
                      className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-colors" 
                      required 
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input 
                      placeholder="••••••••" 
                      className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-colors" 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.fullName}</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input placeholder="John Doe" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.phone}</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input placeholder="+250..." className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">EMAIL ADDRESS</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input placeholder="email@example.com" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input placeholder="Min. 8 characters" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.registerAs}</Label>
                  <RadioGroup defaultValue="passenger" className="flex gap-4" onValueChange={(v) => setRole(v as any)}>
                    <div className={`flex flex-1 items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${role === 'passenger' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100'}`}>
                      <span className="text-sm font-bold uppercase">{t.passenger}</span>
                      <RadioGroupItem value="passenger" className="border-slate-200" />
                    </div>
                    <div className={`flex flex-1 items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${role === 'driver' ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-100'}`}>
                      <span className="text-sm font-bold uppercase">{t.rider}</span>
                      <RadioGroupItem value="driver" className="border-slate-200" />
                    </div>
                  </RadioGroup>
                </div>

                {role === 'driver' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-xs font-black text-slate-400 tracking-widest uppercase">{t.vehicleType}</Label>
                    <RadioGroup defaultValue="moto" className="flex gap-4" onValueChange={(v) => setVehicleType(v as any)}>
                      <div className={`flex flex-1 items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${vehicleType === 'moto' ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                          <Bike className="size-4" />
                          <span className="text-sm font-bold">{t.moto}</span>
                        </div>
                        <RadioGroupItem value="moto" className="border-slate-200" />
                      </div>
                      <div className={`flex flex-1 items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${vehicleType === 'taxi' ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                          <Car className="size-4" />
                          <span className="text-sm font-bold">{t.taxi}</span>
                        </div>
                        <RadioGroupItem value="taxi" className="border-slate-200" />
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </TabsContent>

              <Button type="submit" className={`w-full h-16 rounded-2xl text-xl font-black shadow-lg transition-transform active:scale-95 ${role === 'driver' && !isLogin ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary hover:bg-primary/90'}`} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? t.login : t.signup)}
              </Button>
            </form>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
