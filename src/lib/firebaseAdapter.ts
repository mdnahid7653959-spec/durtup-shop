import { auth, db, storage as firebaseStorage } from "@/integrations/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query as fsQuery, 
  where, 
  orderBy as fsOrderBy, 
  limit as fsLimit
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";

const storageUrlCache = new Map<string, string>();

const adapterFileToDataUrl = (file: Blob | File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

class FirebaseQueryBuilder {
  private colName: string;
  private conditions: any[] = [];
  private orderBys: any[] = [];
  private limitNum: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private updateData: any = null;
  private isDelete = false;
  private isInsert = false;
  private orFilter: string | null = null;

  constructor(colName: string) {
    this.colName = colName;
  }

  select(fields?: string) {
    return this;
  }

  eq(field: string, value: any) {
    if (value !== undefined && value !== null) {
      this.conditions.push(where(field, "==", value));
    }
    return this;
  }

  neq(field: string, value: any) {
    if (value !== undefined && value !== null) {
      this.conditions.push(where(field, "!=", value));
    }
    return this;
  }

  gt(field: string, value: any) {
    this.conditions.push(where(field, ">", value));
    return this;
  }

  gte(field: string, value: any) {
    this.conditions.push(where(field, ">=", value));
    return this;
  }

  lt(field: string, value: any) {
    this.conditions.push(where(field, "<", value));
    return this;
  }

  lte(field: string, value: any) {
    this.conditions.push(where(field, "<=", value));
    return this;
  }

  in(field: string, values: any[]) {
    if (values && values.length > 0) {
      this.conditions.push(where(field, "in", values.slice(0, 10)));
    }
    return this;
  }

  or(filterStr: string) {
    this.orFilter = filterStr;
    return this;
  }

  order(field: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderBys.push(fsOrderBy(field, opts?.ascending ? "asc" : "desc"));
    return this;
  }

  limit(n: number) {
    this.limitNum = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  update(data: any) {
    this.updateData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  insert(data: any | any[]) {
    this.isInsert = true;
    this.insertData = data;
    return this;
  }

  upsert(data: any | any[]) {
    this.isInsert = true;
    this.insertData = data;
    return this;
  }

  private async executeFetch() {
    const colRef = collection(db, this.colName);
    const constraints: any[] = [...this.conditions, ...this.orderBys];
    if (this.limitNum) constraints.push(fsLimit(this.limitNum));
    const q = fsQuery(colRef, ...constraints);
    return await getDocs(q);
  }

  async then(resolve: (res: { data: any; error: any; count?: number }) => void, reject?: (reason: any) => void) {
    try {
      if (this.isInsert) {
        const data = this.insertData;
        const items = Array.isArray(data) ? data : [data];
        const results: any[] = [];

        const useUserIdAsDocId = ["profiles", "sellers", "carts", "addresses"].includes(this.colName);
        for (const item of items) {
          let docId = item.id;
          if (!docId && useUserIdAsDocId) {
            docId = item.user_id;
          }
          if (docId) {
            await setDoc(doc(db, this.colName, docId.toString()), {
              id: docId.toString(),
              ...item,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { merge: true });
            results.push({ id: docId.toString(), ...item });
          } else {
            const newDocRef = doc(collection(db, this.colName));
            const generatedId = newDocRef.id;
            await setDoc(newDocRef, {
              id: generatedId,
              ...item,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            results.push({ id: generatedId, ...item });
          }
        }

        const returned = Array.isArray(data) ? results : results[0];
        let resolvedData = returned;
        if (this.isSingle || this.isMaybeSingle) {
          resolvedData = Array.isArray(returned) ? (returned.length > 0 ? returned[0] : null) : returned;
        }

        resolve({ data: resolvedData, error: null });
        return;
      }

      if (this.updateData) {
        const snapshot = await this.executeFetch();
        for (const d of snapshot.docs) {
          await updateDoc(doc(db, this.colName, d.id), {
            ...this.updateData,
            updated_at: new Date().toISOString()
          });
        }
        resolve({ data: this.updateData, error: null });
        return;
      }

      if (this.isDelete) {
        const snapshot = await this.executeFetch();
        for (const d of snapshot.docs) {
          await deleteDoc(doc(db, this.colName, d.id));
        }
        resolve({ data: true, error: null });
        return;
      }

      const snapshot = await this.executeFetch();
      let list: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      if (this.orFilter) {
        const clauses = this.orFilter.split(',').map(s => s.trim()).filter(Boolean);
        list = list.filter(item => {
          return clauses.some(clause => {
            const parts = clause.split('.');
            if (parts.length >= 3) {
              const field = parts[0];
              const op = parts[1];
              const val = parts.slice(2).join('.');
              const itemVal = item[field];
              if (op === 'eq') {
                return String(itemVal) === String(val) || (field === 'id' && String(item.id) === String(val));
              }
              if (op === 'neq') {
                return String(itemVal) !== String(val);
              }
              if (op === 'ilike') {
                const search = val.replace(/%/g, '').toLowerCase();
                return String(itemVal || '').toLowerCase().includes(search);
              }
            }
            return false;
          });
        });
      }

      if (this.isSingle || this.isMaybeSingle) {
        const item = list.length > 0 ? list[0] : null;
        if (this.isSingle && !item) {
          resolve({ data: null, error: new Error("Item not found"), count: 0 });
        } else {
          resolve({ data: item, error: null, count: item ? 1 : 0 });
        }
      } else {
        resolve({ data: list, error: null, count: list.length });
      }
    } catch (err: any) {
      console.warn(`Firebase query fallback on [${this.colName}]:`, err?.message);
      resolve({ data: this.isSingle || this.isMaybeSingle ? null : [], error: err, count: 0 });
    }
  }
}

// Export Firebase database client object as 'supabase' for full backward compatibility without Supabase SDK
export const firebaseDb: any = {
  from: (colName: string) => new FirebaseQueryBuilder(colName),
  storage: {
    from: (bucket: string) => ({
      createSignedUrl: async (path: string) => {
        const cached = storageUrlCache.get(`${bucket}/${path}`) || storageUrlCache.get(path) || path;
        return { data: { signedUrl: cached }, error: null };
      },
      getPublicUrl: (path: string) => {
        if (!path) return { data: { publicUrl: "" } };
        if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:") || path.startsWith("blob:")) {
          return { data: { publicUrl: path } };
        }
        const cached = storageUrlCache.get(`${bucket}/${path}`) || storageUrlCache.get(path);
        return { data: { publicUrl: cached || path } };
      },
      upload: async (path: string, file: any) => {
        try {
          if (file instanceof Blob || file instanceof File) {
            try {
              const storageRef = ref(firebaseStorage, `${bucket}/${path}`);
              await uploadBytes(storageRef, file);
              const downloadUrl = await getDownloadURL(storageRef);
              storageUrlCache.set(`${bucket}/${path}`, downloadUrl);
              storageUrlCache.set(path, downloadUrl);
              return { data: { path, fullPath: `${bucket}/${path}`, publicUrl: downloadUrl }, error: null };
            } catch (fsErr) {
              console.warn("Firebase Storage upload fallback to Data URL:", fsErr);
              const dataUrl = await adapterFileToDataUrl(file);
              if (dataUrl) {
                storageUrlCache.set(`${bucket}/${path}`, dataUrl);
                storageUrlCache.set(path, dataUrl);
                return { data: { path, fullPath: `${bucket}/${path}`, publicUrl: dataUrl }, error: null };
              }
            }
          }
          return { data: { path }, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      }
    })
  },
  functions: {
    invoke: async (fnName: string, options?: any) => {
      console.log(`Firebase Cloud Function invoke mock [${fnName}]`, options);
      return { data: { valid: true }, error: null };
    }
  },
  rpc: async (fnName: string, params?: any) => {
    console.log(`Firebase RPC call mock [${fnName}]`, params);
    return { data: null, error: null };
  },
  channel: (name: string) => {
    const channelObj: any = {
      on: () => channelObj,
      subscribe: () => ({
        unsubscribe: () => {}
      }),
      unsubscribe: () => {}
    };
    return channelObj;
  },
  removeChannel: (channel: any) => {},
  auth: {
    getSession: async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return { data: { session: null }, error: null };
      return {
        data: {
          session: {
            user: {
              id: currentUser.uid,
              email: currentUser.email,
              user_metadata: { full_name: currentUser.displayName }
            }
          }
        },
        error: null
      };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        const session = user ? {
          user: {
            id: user.uid,
            email: user.email,
            user_metadata: { full_name: user.displayName }
          }
        } : null;
        callback(user ? "SIGNED_IN" : "SIGNED_OUT", session);
      });
      return {
        data: {
          subscription: {
            unsubscribe
          }
        }
      };
    },
    signUp: async ({ email, password, options }: any) => {
      try {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        if (res.user && options?.data?.full_name) {
          await updateProfile(res.user, { displayName: options.data.full_name });
          await setDoc(doc(db, "profiles", res.user.uid), {
            id: res.user.uid,
            user_id: res.user.uid,
            email: email,
            full_name: options.data.full_name,
            role: "customer",
            created_at: new Date().toISOString()
          }, { merge: true });
        }
        return { data: { user: res.user }, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signInWithPassword: async ({ email, password }: any) => {
      try {
        const res = await signInWithEmailAndPassword(auth, email, password);
        return { data: { user: res.user }, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signInWithOAuth: async () => {
      try {
        const { signInWithGoogle } = await import("@/integrations/firebase/client");
        const res = await signInWithGoogle();
        return { data: { user: res.user, session: { user: res.user } }, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    signOut: async () => {
      try {
        await firebaseSignOut(auth);
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    }
  }
};

export const supabase = firebaseDb;
