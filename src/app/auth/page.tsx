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
import { Bike, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const auth = useAuth();
  const db = useFirestore();

  const authIllustration = PlaceHolderImages.find(img => img.id === 'auth-illustration');

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

        const userDocRef = doc(db, 'users', user.uid);
        const userData = {
          userId: user.uid,
          name: name,
          email: email,
          role: role,
          createdAt: serverTimestamp(),
        };

        setDoc(userDocRef, userData)
          .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'create',
              requestResourceData: userData,
            });
            errorEmitter.emit('permission-error', permissionError);
          });

        router.push('/');
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col items-center">
      {/* Blue Header Area */}
      <div className="w-full h-48 auth-header-gradient relative flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 cloud-bg" />
        <div className="relative z-10 flex items-center gap-2 text-white font-bold text-3xl italic tracking-tighter">
          <div className="bg-white/20 p-2 rounded-full">
            <Bike className="size-8" />
          </div>
          SMART MOTO
        </div>
      </div>

      {/* Auth Card */}
      <Card className="w-full max-w-md -mt-16 relative z-20 shadow-xl border-none overflow-hidden">
        <CardContent className="p-0">
          <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')}>
            <div className="p-8">
              <TabsContent value="login" className="mt-0 space-y-6">
                <div className="text-center space-y-1">
                  <h1 className="text-2xl font-bold text-primary">Login to Smart Moto</h1>
                  <p className="text-muted-foreground text-sm">For Passengers & Riders</p>
                </div>

                {/* Illustration Box */}
                <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden border border-blue-100">
                  <div className="flex-1 space-y-1 z-10">
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      <div className="size-6 bg-primary/20 rounded-full flex items-center justify-center">
                        <User className="size-3" />
                      </div>
                      Passengers & Riders
                    </div>
                    <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                      <div className="size-6 bg-green-100 rounded-full flex items-center justify-center">
                        <Phone className="size-3" />
                      </div>
                      Email Login
                    </div>
                  </div>
                  {authIllustration && (
                    <div className="relative w-24 h-24">
                      <Image 
                        src={authIllustration.imageUrl} 
                        alt="Illustration" 
                        fill 
                        className="object-contain" 
                        data-ai-hint="motorcycle illustration"
                      />
                    </div>
                  )}
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input 
                        placeholder="Email Address" 
                        className="pl-10 bg-muted/30 h-12" 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input 
                        placeholder="Password" 
                        className="pl-10 bg-muted/30 h-12" 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button type="button" className="absolute right-3 top-3 text-xs text-primary font-medium">Forgot Password?</button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 h-12 text-lg font-bold" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>

                <div className="text-center text-sm">
                  No account? <button onClick={() => setIsLogin(false)} className="text-secondary font-bold hover:underline">Create Account</button>
                </div>
              </TabsContent>

              <TabsContent value="register" className="mt-0 space-y-6">
                <div className="text-center space-y-1">
                  <h1 className="text-2xl font-bold text-primary">Create Account</h1>
                  <p className="text-muted-foreground text-sm">Join Smart Moto</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input 
                      placeholder="Full Name" 
                      className="pl-10 bg-muted/30 h-12" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input 
                      placeholder="Email Address" 
                      className="pl-10 bg-muted/30 h-12" 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input 
                      placeholder="Create Password" 
                      className="pl-10 bg-muted/30 h-12" 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700">Register as:</Label>
                    <RadioGroup 
                      defaultValue="passenger" 
                      className="flex gap-4" 
                      onValueChange={(v) => setRole(v as any)}
                    >
                      <div className={`flex flex-1 items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${role === 'passenger' ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-2">
                          <div className="size-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <User className="size-4 text-orange-600" />
                          </div>
                          <span className="text-sm font-medium">Passenger</span>
                        </div>
                        <RadioGroupItem value="passenger" id="passenger" />
                      </div>
                      <div className={`flex flex-1 items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${role === 'driver' ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-2">
                          <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Bike className="size-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium">Rider</span>
                        </div>
                        <RadioGroupItem value="driver" id="driver" />
                      </div>
                    </RadioGroup>
                  </div>

                  <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 h-12 text-lg font-bold" disabled={isLoading}>
                    {isLoading ? 'Registering...' : 'Register'}
                  </Button>
                </form>

                <div className="text-center text-sm">
                  Already have an account? <button onClick={() => setIsLogin(true)} className="text-primary font-bold hover:underline">Login</button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
