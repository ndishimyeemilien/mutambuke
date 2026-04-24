
'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<ReturnType<typeof initializeFirebase> | null>(null);

  useEffect(() => {
    setServices(initializeFirebase());
  }, []);

  if (!services) return null;

  return (
    <FirebaseProvider app={services.app} db={services.db} auth={services.auth}>
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
