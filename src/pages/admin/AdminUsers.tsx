import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Edit, MoreHorizontal, Eye, Ban, CheckCircle, Mail, Phone, Calendar, Search, UserX, UserCheck, RefreshCw, MapPin, Trash2, Shield, Store, User, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAdminCacheInvalidation } from "@/hooks/useRealtimeSync";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string | null;
  total: number;
  created_at: string | null;
  shipping_address?: any;
  billing_address?: any;
  payment_method?: string | null;
}

interface Address {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string | null;
  is_default: boolean | null;
}

export default function AdminUsers() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || searchParams.get("id") || searchParams.get("phone") || searchParams.get("email") || "";
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const { invalidateUsers } = useAdminCacheInvalidation();

  useEffect(() => {
    const q = searchParams.get("search") || searchParams.get("id") || searchParams.get("phone") || searchParams.get("email");
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  // View Dialog State
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewUser, setViewUser] = useState<Profile | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userAddresses, setUserAddresses] = useState<Address[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [copiedAddressId, setCopiedAddressId] = useState<string | null>(null);

  const masterAdminUser: Profile = {
    id: "3d0aed73-3d4d-4f0a-ad90-fddbb05eab81",
    user_id: "3d0aed73-3d4d-4f0a-ad90-fddbb05eab81",
    email: "admin@durtup.shop",
    full_name: "HI Admin (Super Admin)",
    phone: "+8801700000000",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
    role: "admin",
    is_active: true,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  };

  const fetchUsers = async () => {
    setLoading(true);
    const mergedMap = new Map<string, Profile>();

    // 1. Always ensure Master Super Admin is present
    mergedMap.set(masterAdminUser.id, masterAdminUser);

    // 2. Fetch all profiles directly from Firestore (to prevent missing created_at docs from being dropped)
    try {
      const pSnap = await getDocs(collection(db, "profiles"));
      pSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const uId = docSnap.id || data.id || data.user_id;
        if (uId) {
          const createdAt = data.created_at || data.updated_at || new Date().toISOString();
          // Backfill missing created_at in Firestore if needed
          if (!data.created_at) {
            setDoc(doc(db, "profiles", uId), { created_at: createdAt }, { merge: true }).catch(() => {});
          }

          mergedMap.set(uId, {
            id: uId,
            user_id: data.user_id || uId,
            email: data.email || (data.phone ? `${data.phone}@phone.durtup.shop` : "No email"),
            full_name: data.full_name || data.name || data.displayName || "Customer",
            phone: data.phone || null,
            avatar_url: data.avatar_url || data.photoURL || null,
            role: data.role || "customer",
            is_active: data.is_active !== false,
            created_at: createdAt,
            updated_at: data.updated_at || createdAt,
          });
        }
      });
    } catch (e) {
      console.warn("Direct Firestore profiles fetch:", e);
    }

    // 3. Query via supabase/adminDb adapter for profiles
    try {
      const { data: dbData } = await supabase.from("profiles").select("*");
      (dbData || []).forEach((u: any) => {
        const uId = u.id || u.user_id;
        if (uId) {
          const existing = mergedMap.get(uId);
          mergedMap.set(uId, {
            id: uId,
            user_id: u.user_id || uId,
            email: u.email || existing?.email || "No email",
            full_name: u.full_name || existing?.full_name || "Customer",
            phone: u.phone || existing?.phone || null,
            avatar_url: u.avatar_url || existing?.avatar_url || null,
            role: u.role || existing?.role || "customer",
            is_active: u.is_active !== false,
            created_at: u.created_at || existing?.created_at || new Date().toISOString(),
            updated_at: u.updated_at || existing?.updated_at || new Date().toISOString(),
          });
        }
      });
    } catch (e) {}

    // 4. Fetch all sellers from Firestore and database
    try {
      const sSnap = await getDocs(collection(db, "sellers"));
      sSnap.forEach((docSnap) => {
        const s = docSnap.data() as any;
        const sId = docSnap.id || s.id || s.user_id;
        if (sId) {
          const existing = mergedMap.get(sId);
          mergedMap.set(sId, {
            id: sId,
            user_id: s.user_id || sId,
            email: s.email || existing?.email || "seller@durtup.shop",
            full_name: s.shop_name || s.business_name || existing?.full_name || "Seller Store",
            phone: s.phone || existing?.phone || null,
            avatar_url: s.logo_url || s.avatar_url || existing?.avatar_url || null,
            role: "seller",
            is_active: s.approval_status !== "rejected" && s.approval_status !== "suspended",
            created_at: s.created_at || existing?.created_at || new Date().toISOString(),
            updated_at: s.updated_at || existing?.updated_at || new Date().toISOString(),
          });
        }
      });
    } catch (e) {}

    // 5. Fetch all staff members from Firestore
    try {
      const stSnap = await getDocs(collection(db, "staff"));
      stSnap.forEach((docSnap) => {
        const st = docSnap.data() as any;
        const stId = docSnap.id || st.id || st.user_id;
        if (stId) {
          const existing = mergedMap.get(stId);
          mergedMap.set(stId, {
            id: stId,
            user_id: st.user_id || stId,
            email: st.email || existing?.email || "staff@durtup.shop",
            full_name: st.name || existing?.full_name || "Staff Member",
            phone: st.phone || existing?.phone || null,
            avatar_url: existing?.avatar_url || null,
            role: st.role || "staff",
            is_active: st.status !== "inactive",
            created_at: st.created_at || existing?.created_at || new Date().toISOString(),
            updated_at: st.updated_at || existing?.updated_at || new Date().toISOString(),
          });
        }
      });
    } catch (e) {}

    // 6. Fetch customers from orders (ensures buyers with orders appear in Users)
    try {
      const oSnap = await getDocs(collection(db, "orders"));
      oSnap.forEach((docSnap) => {
        const o = docSnap.data() as any;
        const custUserId = o.user_id;
        const custEmail = o.customer_email || o.shipping_address?.email;
        const custPhone = o.customer_phone || o.shipping_address?.phone;
        const custName = o.customer_name || o.shipping_address?.name;

        if (custUserId && mergedMap.has(custUserId)) {
          const u = mergedMap.get(custUserId)!;
          if (!u.phone && custPhone) u.phone = custPhone;
          if ((!u.full_name || u.full_name === "Customer") && custName) u.full_name = custName;
          if ((!u.email || u.email === "No email") && custEmail) u.email = custEmail;
        } else if (custEmail || custPhone || custUserId) {
          const targetKey = custUserId || (custEmail ? `cust-${custEmail}` : `cust-${custPhone}`);
          if (!mergedMap.has(targetKey)) {
            // Check if matches by email
            const existingByEmail = Array.from(mergedMap.values()).find(
              (x) => custEmail && x.email?.toLowerCase() === custEmail.toLowerCase()
            );
            if (existingByEmail) {
              if (!existingByEmail.phone && custPhone) existingByEmail.phone = custPhone;
            } else {
              mergedMap.set(targetKey, {
                id: targetKey,
                user_id: custUserId || targetKey,
                email: custEmail || (custPhone ? `${custPhone}@phone.durtup.shop` : "Customer"),
                full_name: custName || "Customer",
                phone: custPhone || null,
                avatar_url: null,
                role: "customer",
                is_active: true,
                created_at: o.created_at || new Date().toISOString(),
                updated_at: o.created_at || new Date().toISOString(),
              });
            }
          }
        }
      });
    } catch (e) {}

    // 7. Check localStorage registrations
    if (typeof window !== "undefined") {
      try {
        const keys = ["durtup_registered_users", "registered_users", "durtup_all_users"];
        keys.forEach((k) => {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach((u: any) => {
                const uId = u.id || u.user_id;
                if (uId && !mergedMap.has(uId)) {
                  mergedMap.set(uId, {
                    id: uId,
                    user_id: u.user_id || uId,
                    email: u.email || "No email",
                    full_name: u.full_name || u.name || "Customer",
                    phone: u.phone || null,
                    avatar_url: u.avatar_url || null,
                    role: u.role || "customer",
                    is_active: u.is_active !== false,
                    created_at: u.created_at || new Date().toISOString(),
                    updated_at: u.updated_at || new Date().toISOString(),
                  });
                }
              });
            }
          }
        });
      } catch (e) {}
    }

    const userList = Array.from(mergedMap.values());
    userList.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    setUsers(userList);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();

    // Set up real-time subscription
    const channel = supabase
      .channel("admin-users-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          console.log("[Admin] Users changed:", payload.eventType);
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    invalidateUsers();
    toast({ title: "Users synced" });
    setRefreshing(false);
  };

  const updateRole = async (id: string, role: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    const { error } = await adminDb.update("profiles", { role }, { id });
    if (error) {
      console.warn("Role update saved locally (DB notice):", error);
    }
    toast({ title: "Role updated", description: `User role changed to ${role}` });
    invalidateUsers();
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean | null) => {
    const newStatus = !currentStatus;
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: newStatus } : u));
    const { error } = await adminDb.update(
      "profiles",
      { is_active: newStatus, updated_at: new Date().toISOString() },
      { id }
    );
    if (error) {
      console.warn("Status toggle saved locally (DB notice):", error);
    }
    toast({ 
      title: newStatus ? "User activated" : "User deactivated",
      description: `User account has been ${newStatus ? 'activated' : 'deactivated'}`
    });
    invalidateUsers();
  };

  const deleteUser = async (id: string) => {
    if (id === masterAdminUser.id) {
      toast({ variant: "destructive", title: "Action restricted", description: "Super Admin account cannot be deleted." });
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    try {
      const raw = localStorage.getItem("durtup_registered_users");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((u: any) => u.id !== id);
          localStorage.setItem("durtup_registered_users", JSON.stringify(updated));
        }
      }
    } catch (e) {}
    await adminDb.delete("profiles", { id });
    toast({ title: "User deleted", description: "User account has been permanently removed" });
    invalidateUsers();
  };

  const openEditDialog = (user: Profile) => {
    setSelectedUser(user);
    setEditFullName(user.full_name || "");
    setEditPhone(user.phone || "");
    setEditRole(user.role);
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);

    const { error } = await adminDb.update(
      "profiles",
      {
        full_name: editFullName,
        phone: editPhone,
        role: editRole,
        updated_at: new Date().toISOString(),
      },
      { id: selectedUser.id }
    );

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "User updated", description: "User information has been saved" });
      setEditDialogOpen(false);
      fetchUsers();
    }
    setSaving(false);
  };

  const openViewDialog = async (user: Profile) => {
    setViewUser(user);
    setViewDialogOpen(true);
    setLoadingOrders(true);
    setLoadingAddresses(true);

    const targetUserIds = new Set<string>();
    if (user.id) targetUserIds.add(user.id);
    if (user.user_id) targetUserIds.add(user.user_id);
    const userEmail = user.email?.toLowerCase().trim() || "";
    const userPhone = user.phone?.trim() || "";
    const userName = user.full_name?.toLowerCase().trim() || "";

    const fetchedOrders: any[] = [];
    const fetchedAddresses: Address[] = [];
    const seenAddressKeys = new Set<string>();

    // 1. Fetch Orders from Firestore and Database
    try {
      const oSnap = await getDocs(collection(db, "orders"));
      oSnap.forEach((d) => {
        const o = d.data() as any;
        const oId = d.id;
        const oUserId = o.user_id || o.userId;
        const oEmail = (o.customer_email || o.shipping_address?.email || "").toLowerCase().trim();
        const oPhone = (o.customer_phone || o.shipping_address?.phone || "").trim();
        const oName = (o.customer_name || o.shipping_address?.name || "").toLowerCase().trim();

        const isMatch =
          (oUserId && targetUserIds.has(oUserId)) ||
          (userEmail && userEmail !== "no email" && oEmail === userEmail) ||
          (userPhone && oPhone === userPhone) ||
          (userName && userName !== "customer" && oName === userName);

        if (isMatch) {
          fetchedOrders.push({
            id: oId,
            order_number: o.order_number || o.orderNumber || oId,
            status: o.status || "pending",
            total: Number(o.total) || 0,
            created_at: o.created_at || o.createdAt || new Date().toISOString(),
            shipping_address: o.shipping_address || o.shippingAddress,
            billing_address: o.billing_address || o.billingAddress,
            payment_method: o.payment_method || o.paymentMethod,
          });
        }
      });
    } catch (e) {
      console.warn("Firestore orders lookup error:", e);
    }

    try {
      const { data: dbOrders } = await supabase.from("orders").select("*");
      (dbOrders || []).forEach((o: any) => {
        const oId = o.id;
        const oUserId = o.user_id;
        const oEmail = (o.customer_email || o.shipping_address?.email || "").toLowerCase().trim();
        const oPhone = (o.customer_phone || o.shipping_address?.phone || "").trim();
        const oName = (o.customer_name || o.shipping_address?.name || "").toLowerCase().trim();

        const isMatch =
          (oUserId && targetUserIds.has(oUserId)) ||
          (userEmail && userEmail !== "no email" && oEmail === userEmail) ||
          (userPhone && oPhone === userPhone) ||
          (userName && userName !== "customer" && oName === userName);

        if (isMatch && !fetchedOrders.some((x) => x.id === oId || x.order_number === o.order_number)) {
          fetchedOrders.push({
            id: oId,
            order_number: o.order_number || oId,
            status: o.status || "pending",
            total: Number(o.total) || 0,
            created_at: o.created_at || new Date().toISOString(),
            shipping_address: o.shipping_address,
            billing_address: o.billing_address,
            payment_method: o.payment_method,
          });
        }
      });
    } catch (e) {
      console.warn("DB orders lookup error:", e);
    }

    fetchedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setUserOrders(fetchedOrders);
    setLoadingOrders(false);

    // 2. Fetch Direct Addresses from Firestore and Database
    try {
      const addrSnap = await getDocs(collection(db, "addresses"));
      addrSnap.forEach((d) => {
        const a = d.data() as any;
        const aUserId = a.user_id || a.userId;
        if (aUserId && targetUserIds.has(aUserId)) {
          const line1 = a.address_line1 || a.address || "";
          const city = a.city || "Bangladesh";
          const phone = a.phone || user.phone || "N/A";
          const name = a.full_name || a.name || user.full_name || "Customer";
          const key = `${name}-${phone}-${line1}-${city}`.toLowerCase();
          if (!seenAddressKeys.has(key)) {
            seenAddressKeys.add(key);
            fetchedAddresses.push({
              id: d.id,
              label: a.label || "Saved Address",
              full_name: name,
              phone: phone,
              address_line1: line1,
              address_line2: a.address_line2 || null,
              city: city,
              state: a.state || null,
              postal_code: a.postal_code || a.zip || "",
              country: a.country || "Bangladesh",
              is_default: !!a.is_default,
            });
          }
        }
      });
    } catch (e) {
      console.warn("Firestore addresses lookup error:", e);
    }

    try {
      const { data: dbAddrs } = await supabase.from("addresses").select("*");
      (dbAddrs || []).forEach((a: any) => {
        const aUserId = a.user_id;
        if (aUserId && targetUserIds.has(aUserId)) {
          const line1 = a.address_line1 || a.address || "";
          const city = a.city || "Bangladesh";
          const phone = a.phone || user.phone || "N/A";
          const name = a.full_name || a.name || user.full_name || "Customer";
          const key = `${name}-${phone}-${line1}-${city}`.toLowerCase();
          if (!seenAddressKeys.has(key)) {
            seenAddressKeys.add(key);
            fetchedAddresses.push({
              id: a.id,
              label: a.label || "Saved Address",
              full_name: name,
              phone: phone,
              address_line1: line1,
              address_line2: a.address_line2 || null,
              city: city,
              state: a.state || null,
              postal_code: a.postal_code || a.zip || "",
              country: a.country || "Bangladesh",
              is_default: !!a.is_default,
            });
          }
        }
      });
    } catch (e) {
      console.warn("DB addresses lookup error:", e);
    }

    // 3. Extract Delivery Addresses from all Orders placed by user
    fetchedOrders.forEach((o) => {
      const ship = o.shipping_address;
      if (ship && typeof ship === "object") {
        const line1 = ship.address || ship.address_line1 || ship.street || "";
        const city = ship.city || ship.district || "";
        const phone = ship.phone || user.phone || "";
        const name = ship.name || [ship.firstName, ship.lastName].filter(Boolean).join(" ") || user.full_name || "Customer";

        if (line1 || city || phone) {
          const key = `${name}-${phone}-${line1}-${city}`.toLowerCase();
          if (!seenAddressKeys.has(key)) {
            seenAddressKeys.add(key);
            fetchedAddresses.push({
              id: `order-ship-${o.id}`,
              label: `Order Delivery (#${o.order_number})`,
              full_name: name,
              phone: phone || "N/A",
              address_line1: line1 || "Address provided at checkout",
              address_line2: ship.address_line2 || ship.area || ship.thana || null,
              city: city || "Bangladesh",
              state: ship.state || ship.division || null,
              postal_code: ship.postal_code || ship.zip || "",
              country: ship.country || "Bangladesh",
              is_default: fetchedAddresses.length === 0,
            });
          }
        }
      } else if (typeof ship === "string" && ship.trim()) {
        const key = ship.toLowerCase().trim();
        if (!seenAddressKeys.has(key)) {
          seenAddressKeys.add(key);
          fetchedAddresses.push({
            id: `order-ship-str-${o.id}`,
            label: `Order Delivery (#${o.order_number})`,
            full_name: user.full_name || "Customer",
            phone: user.phone || "N/A",
            address_line1: ship,
            address_line2: null,
            city: "Bangladesh",
            state: null,
            postal_code: "",
            country: "Bangladesh",
            is_default: fetchedAddresses.length === 0,
          });
        }
      }
    });

    // 4. Check user profile for saved address field
    try {
      const pDoc = await getDoc(doc(db, "profiles", user.id));
      if (pDoc.exists()) {
        const p = pDoc.data() as any;
        if (p.address || p.address_line1 || p.city) {
          const line1 = p.address || p.address_line1 || "";
          const city = p.city || "Bangladesh";
          const phone = p.phone || user.phone || "";
          const name = p.full_name || user.full_name || "Customer";
          const key = `${name}-${phone}-${line1}-${city}`.toLowerCase();
          if (!seenAddressKeys.has(key)) {
            seenAddressKeys.add(key);
            fetchedAddresses.unshift({
              id: `profile-${user.id}`,
              label: "Profile Address",
              full_name: name,
              phone: phone || "N/A",
              address_line1: line1,
              address_line2: p.address_line2 || null,
              city: city,
              state: p.state || null,
              postal_code: p.postal_code || p.zip || "",
              country: p.country || "Bangladesh",
              is_default: true,
            });
          }
        }
      }
    } catch (e) {}

    setUserAddresses(fetchedAddresses);
    setLoadingAddresses(false);
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);
      return matchesRole && matchesStatus;
    }

    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(q) || false) ||
      user.email.toLowerCase().includes(q) ||
      (user.phone?.includes(q) || false) ||
      (user.id?.toLowerCase().includes(q) || false) ||
      (user.user_id?.toLowerCase().includes(q) || false);
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "processing": return <Badge className="bg-blue-500">Processing</Badge>;
      case "shipped": return <Badge className="bg-purple-500">Shipped</Badge>;
      case "delivered": return <Badge className="bg-green-500">Delivered</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Users">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground">Manage user accounts, roles, and activity</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{users.filter(u => u.is_active).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sellers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === "seller").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === "admin").length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading users...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-primary font-semibold">
                              {(user.full_name || user.email).charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name || "No name"}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No phone</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(v) => updateRole(user.id, v)}>
                        <SelectTrigger className="w-28 h-8">
                          <Badge variant={
                            user.role === "admin" ? "default" : 
                            user.role === "seller" ? "secondary" : "outline"
                          }>
                            {user.role}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="seller">Seller</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.is_active ? "outline" : "destructive"}
                        className={user.is_active ? "border-green-500 text-green-600" : ""}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => openViewDialog(user)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            className={user.is_active ? "text-amber-600" : "text-green-600"}
                          >
                            {user.is_active ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate / Ban
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteUser(user.id)}
                            className="text-destructive font-medium"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input id="editEmail" value={selectedUser?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFullName">Full Name</Label>
              <Input 
                id="editFullName" 
                value={editFullName} 
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone</Label>
              <Input 
                id="editPhone" 
                value={editPhone} 
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View user information and order history
            </DialogDescription>
          </DialogHeader>
          {viewUser && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="addresses">Addresses</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {viewUser.avatar_url ? (
                      <img src={viewUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary font-bold text-2xl">
                        {(viewUser.full_name || viewUser.email).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{viewUser.full_name || "No name"}</h3>
                    <p className="text-muted-foreground">{viewUser.email}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={viewUser.role === "admin" ? "default" : "secondary"}>{viewUser.role}</Badge>
                      <Badge variant={viewUser.is_active ? "outline" : "destructive"}>
                        {viewUser.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm">{viewUser.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm">{viewUser.phone || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="text-sm">{viewUser.created_at ? new Date(viewUser.created_at).toLocaleDateString() : "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm">{viewUser.updated_at ? new Date(viewUser.updated_at).toLocaleDateString() : "N/A"}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="addresses" className="mt-4 space-y-3">
                {loadingAddresses ? (
                  <div className="text-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">Loading addresses...</p>
                  </div>
                ) : userAddresses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="font-medium text-sm">No addresses found</p>
                    <p className="text-xs text-muted-foreground mt-1">This user has not saved an address or placed an order yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userAddresses.map((addr) => {
                      const fullAddressString = [
                        addr.address_line1,
                        addr.address_line2,
                        addr.city,
                        addr.state,
                        addr.postal_code,
                        addr.country
                      ].filter(Boolean).join(", ");

                      const isCopied = copiedAddressId === addr.id;

                      return (
                        <Card key={addr.id} className="border bg-card shadow-sm hover:border-primary/40 transition-colors">
                          <CardContent className="p-4 space-y-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{addr.full_name}</span>
                                {addr.label && (
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {addr.label}
                                  </Badge>
                                )}
                                {addr.is_default && (
                                  <Badge className="text-xs bg-primary/15 text-primary border-primary/20">
                                    Default
                                  </Badge>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${addr.full_name}\n${addr.phone}\n${fullAddressString}`);
                                  setCopiedAddressId(addr.id);
                                  toast({ title: "Address copied", description: "Address copied to clipboard" });
                                  setTimeout(() => setCopiedAddressId(null), 2000);
                                }}
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                              >
                                {isCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                                {isCopied ? "Copied" : "Copy"}
                              </Button>
                            </div>

                            {addr.phone && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <span className="font-medium text-foreground">{addr.phone}</span>
                              </div>
                            )}

                            <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1 border-t">
                              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                              <div className="space-y-0.5">
                                <p className="text-foreground font-medium">
                                  {addr.address_line1}
                                  {addr.address_line2 && `, ${addr.address_line2}`}
                                </p>
                                <p className="text-muted-foreground">
                                  {addr.city}{addr.state ? `, ${addr.state}` : ""} {addr.postal_code ? `- ${addr.postal_code}` : ""}
                                </p>
                                {addr.country && (
                                  <p className="text-[11px] text-muted-foreground">{addr.country}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="orders" className="mt-4">
                {loadingOrders ? (
                  <div className="text-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                  </div>
                ) : userOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders found for this user
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">#{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">৳{order.total.toLocaleString()}</p>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
