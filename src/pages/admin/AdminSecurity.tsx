import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firebaseAdapter";
import { Shield, Users, Key, Activity, Plus, Edit, Trash2, Lock, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_system: boolean;
}

interface ActivityLog {
  id: string;
  admin_id: string;
  action: string;
  details: any;
  ip_address: string | null;
  created_at: string;
}

const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard", description: "View analytics and stats" },
  { key: "products", label: "Products", description: "Manage products" },
  { key: "inventory", label: "Inventory", description: "Manage stock levels" },
  { key: "orders", label: "Orders", description: "Process orders" },
  { key: "users", label: "Users", description: "Manage customers" },
  { key: "sellers", label: "Sellers", description: "Manage vendors" },
  { key: "coupons", label: "Coupons", description: "Manage discounts" },
  { key: "campaigns", label: "Marketing", description: "Manage campaigns" },
  { key: "cms", label: "CMS", description: "Manage content" },
  { key: "reports", label: "Reports", description: "View reports" },
  { key: "settings", label: "Settings", description: "System settings" },
  { key: "security", label: "Security", description: "Manage security" },
];

export default function AdminSecurity() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const { toast } = useToast();

  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    permissions: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, logsRes] = await Promise.all([
        supabase.from("admin_roles").select("*").order("name"),
        supabase.from("admin_activity_logs").select("*").order("created_at", { ascending: false }).limit(50)
      ]);

      if (rolesRes.data) {
        setRoles(rolesRes.data.map(r => ({
          ...r,
          permissions: Array.isArray(r.permissions) ? r.permissions.map(String) : []
        })));
      }
      if (logsRes.data) setActivityLogs(logsRes.data);
    } catch (error) {
      console.error("Error fetching security data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveRole = async () => {
    const data = {
      name: roleForm.name.toLowerCase().replace(/\s+/g, "_"),
      description: roleForm.description,
      permissions: roleForm.permissions,
      is_system: false
    };

    if (editingRole) {
      if (editingRole.is_system) {
        toast({ variant: "destructive", title: "Cannot edit system roles" });
        return;
      }
      await supabase.from("admin_roles").update(data).eq("id", editingRole.id);
      toast({ title: "Role updated" });
    } else {
      await supabase.from("admin_roles").insert(data);
      toast({ title: "Role created" });
    }

    setRoleDialogOpen(false);
    setEditingRole(null);
    setRoleForm({ name: "", description: "", permissions: [] });
    fetchData();
  };

  const deleteRole = async (role: AdminRole) => {
    if (role.is_system) {
      toast({ variant: "destructive", title: "Cannot delete system roles" });
      return;
    }
    if (!confirm("Delete this role?")) return;
    await supabase.from("admin_roles").delete().eq("id", role.id);
    fetchData();
  };

  const togglePermission = (permission: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const getActionColor = (action: string) => {
    if (action.includes("delete") || action.includes("ban")) return "text-red-600";
    if (action.includes("create") || action.includes("approve")) return "text-green-600";
    if (action.includes("update") || action.includes("edit")) return "text-blue-600";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <AdminLayout title="Security & Permissions">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Security & Permissions">
      <div className="space-y-6">
        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-sm text-muted-foreground">Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Key className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{PERMISSION_MODULES.length}</p>
                  <p className="text-sm text-muted-foreground">Modules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roles.filter(r => r.is_system).length}</p>
                  <p className="text-sm text-muted-foreground">System Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activityLogs.length}</p>
                  <p className="text-sm text-muted-foreground">Recent Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="activity">Activity Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Admin Roles</CardTitle>
                    <CardDescription>Manage role-based access control</CardDescription>
                  </div>
                  <Button onClick={() => setRoleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map((role) => (
                    <Card key={role.id} className="relative">
                      {role.is_system && (
                        <Badge className="absolute top-2 right-2" variant="secondary">System</Badge>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium capitalize">{role.name.replace(/_/g, " ")}</h3>
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                            <div className="mt-3 flex flex-wrap gap-1">
                              {role.permissions.includes("*") ? (
                                <Badge variant="default">All Access</Badge>
                              ) : (
                                role.permissions.slice(0, 3).map(p => (
                                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                                ))
                              )}
                              {role.permissions.length > 3 && !role.permissions.includes("*") && (
                                <Badge variant="outline" className="text-xs">+{role.permissions.length - 3}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {!role.is_system && (
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRole(role);
                                setRoleForm({
                                  name: role.name,
                                  description: role.description || "",
                                  permissions: role.permissions
                                });
                                setRoleDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteRole(role)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent admin actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No activity logs yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      activityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className={`font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </TableCell>
                          <TableCell>{log.admin_id.slice(0, 8)}...</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {JSON.stringify(log.details)}
                          </TableCell>
                          <TableCell>{log.ip_address || "-"}</TableCell>
                          <TableCell>{format(new Date(log.created_at), "PPp")}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="content_editor"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Can manage content and CMS"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-auto p-2 border rounded-lg">
                {PERMISSION_MODULES.map((module) => (
                  <div key={module.key} className="flex items-start space-x-2">
                    <Checkbox
                      id={module.key}
                      checked={roleForm.permissions.includes(module.key)}
                      onCheckedChange={() => togglePermission(module.key)}
                    />
                    <div className="grid gap-1 leading-none">
                      <label htmlFor={module.key} className="text-sm font-medium cursor-pointer">
                        {module.label}
                      </label>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRoleDialogOpen(false); setEditingRole(null); }}>
              Cancel
            </Button>
            <Button onClick={saveRole}>Save Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
