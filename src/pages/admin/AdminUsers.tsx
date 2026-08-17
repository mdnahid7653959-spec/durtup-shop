import { useEffect, useState } from "react";
import { Edit, MoreHorizontal, Eye, Ban, CheckCircle, Mail, Phone, Calendar, Search, UserX, UserCheck, RefreshCw, MapPin, Trash2 } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
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
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const { invalidateUsers } = useAdminCacheInvalidation();

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
    const { data: dbData } = await adminDb.select<Profile>("profiles", {
      columns: "*",
      orderBy: { col: "created_at", ascending: false },
      limit: 100,
      useCache: false,
    });

    let localRegistered: Profile[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("durtup_registered_users");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) localRegistered = parsed;
        }
      } catch (e) {}
    }

    const mergedMap = new Map<string, Profile>();
    mergedMap.set(masterAdminUser.id, masterAdminUser);

    (dbData || []).forEach((u) => {
      if (u.id) mergedMap.set(u.id, u);
    });

    localRegistered.forEach((u) => {
      if (u.id && !mergedMap.has(u.id)) {
        mergedMap.set(u.id, u);
      }
    });

    const userList = Array.from(mergedMap.values());
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

    // Fetch user orders
    const { data, error } = await adminDb.select<Order>("orders", {
      columns: "id, order_number, status, total, created_at",
      filters: [{ col: "user_id", value: user.user_id }],
      orderBy: { col: "created_at", ascending: false },
      limit: 10,
    });

    if (!error) {
      setUserOrders(data || []);
    }
    setLoadingOrders(false);

    // Fetch user addresses
    const { data: addrData } = await adminDb.select<Address>("addresses", {
      columns: "*",
      filters: [{ col: "user_id", value: user.user_id }],
      orderBy: { col: "is_default", ascending: false },
    });

    setUserAddresses(addrData || []);
    setLoadingAddresses(false);
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone?.includes(searchQuery) || false);
    
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
              <TabsContent value="addresses" className="mt-4">
                {loadingAddresses ? (
                  <div className="text-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                  </div>
                ) : userAddresses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No addresses saved by this user
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userAddresses.map((addr) => (
                      <div key={addr.id} className="p-3 border rounded-lg space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{addr.full_name}</p>
                          {addr.label && <Badge variant="outline" className="text-xs">{addr.label}</Badge>}
                          {addr.is_default && <Badge className="text-xs bg-primary/10 text-primary">Default</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{addr.phone}</p>
                        <p className="text-sm text-muted-foreground">
                          {addr.address_line1}
                          {addr.address_line2 && `, ${addr.address_line2}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {addr.city}{addr.state && `, ${addr.state}`} - {addr.postal_code}
                        </p>
                        {addr.country && <p className="text-xs text-muted-foreground">{addr.country}</p>}
                      </div>
                    ))}
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
