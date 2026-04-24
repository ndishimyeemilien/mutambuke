
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc(path: string | null) {
  const db = useFirestore();
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !path) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, path);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        setData(snapshot.data() || null);
        setLoading(false);
      },
      async (error) => {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path,
            operation: 'get',
          }));
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, path]);

  return { data, loading };
}
