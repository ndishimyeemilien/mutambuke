'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bike, Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userData = {
          userId: user.uid,
          name: name,
          email: email,
          phone: phone,
          role: role,
          createdAt: serverTimestamp(),
        };

        setDoc(doc(db, 'users', user.uid), userData)
          .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `users/${user.uid}`,
              operation: 'create',
              requestResourceData: userData,
            }));
          });

        if (role === 'driver') {
          const driverData = {
            driverId: user.uid,
            status: 'offline',
            isVerified: false,
            updatedAt: serverTimestamp(),
          };
          setDoc(doc(db, 'drivers', user.uid), driverData)
            .catch(async (error) => {
               errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `drivers/${user.uid}`,
                operation: 'create',
                requestResourceData: driverData,
              }));
            });
        }

        router.push('/');
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Left side: Visual Content */}
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

      {/* Right side: Form */}
      <div className="flex-1 flex flex-col justify-center p-6 md:p-12 bg-white">
        <div className="max-w-md w-full mx-auto space-y-8">
          <Link href="/landing" className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors font-bold text-sm">
            <ArrowLeft className="size-4" /> BACK TO HOME
          </Link>

          <div className="space-y-2">
            <h2 className="text-4xl font-black italic text-slate-900">
              {isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
            </h2>
            <p className="text-slate-500">
              {isLogin ? 'Enter your details to access your dashboard' : 'Join the fastest urban transport network'}
            </p>
          </div>

          <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 bg-slate-100 p-1 mb-8">
              <TabsTrigger value="login" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">LOGIN</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">SIGN UP</TabsTrigger>
            </TabsList>

            <form onSubmit={handleAuth} className="space-y-4">
              <TabsContent value="login" className="space-y-4 mt-0">
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest">EMAIL ADDRESS</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input 
                      placeholder="name@example.com" 
                      className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-colors" 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest">PASSWORD</Label>
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
                    <Label className="text-xs font-black text-slate-400 tracking-widest">FULL NAME</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input placeholder="John Doe" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-black text-slate-400 tracking-widest">PHONE</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input placeholder="+250..." className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest">EMAIL ADDRESS</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input placeholder="email@example.com" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-400 tracking-widest">PASSWORD</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input placeholder="Min. 8 characters" className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-black text-slate-400 tracking-widest">REGISTER AS</Label>
                  <RadioGroup defaultValue="passenger" className="flex gap-4" onValueChange={(v) => setRole(v as any)}>
                    <div className={`flex flex-1 items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${role === 'passenger' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100'}`}>
                      <span className="text-sm font-bold">PASSENGER</span>
                      <RadioGroupItem value="passenger" className="border-slate-200" />
                    </div>
                    <div className={`flex flex-1 items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${role === 'driver' ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-100'}`}>
                      <span className="text-sm font-bold">RIDER</span>
                      <RadioGroupItem value="driver" className="border-slate-200" />
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>

              <Button type="submit" className={`w-full h-16 rounded-2xl text-xl font-black shadow-lg transition-transform active:scale-95 ${role === 'driver' && !isLogin ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary hover:bg-primary/90'}`} disabled={isLoading}>
                {isLoading ? 'PROCESSING...' : (isLogin ? 'LOGIN' : 'SIGN UP')}
              </Button>
            </form>
          </Tabs>

          <p className="text-center text-sm text-slate-400">
            By continuing, you agree to our <span className="text-slate-900 font-bold hover:underline cursor-pointer">Terms of Service</span> and <span className="text-slate-900 font-bold hover:underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
