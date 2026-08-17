import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { staffAdmin } from "@/lib/staffAdmin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { PERMISSION_CATALOG } from "@/lib/staffPermissions";
import { Plus, Loader2, Send, Copy, MailPlus, Ban, RotateCcw, ClipboardList } from "lucide-react";

export default function AdminStaff() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [taskFor, setTaskFor] = useState<any | null>(null);
  const [msgFor, setMsgFor] = useState<any | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, d] = await Promise.all([
        staffAdmin({ action: "list_staff" }),
        staffAdmin({ action: "list_roles" }),
        staffAdmin({ action: "list_departments" }),
      ]);
      setStaff(s.data || []);
      setRoles(r.data || []);
      setDepts(d.data || []);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <AdminLayout title="Staff Management">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-muted-foreground">Create staff accounts, assign roles, permissions, tasks, and messages.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Invite Staff</Button>
      </div>

      {lastInviteUrl && (
        <Card className="p-4 mb-4 bg-primary/5 border-primary/30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-medium">Activation link (share with the staff member)</p>
              <p className="text-xs text-muted-foreground break-all">{lastInviteUrl}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(lastInviteUrl); toast({ title: "Copied" }); }}>
              <Copy className="h-4 w-4 mr-2" /> Copy
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Department</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="p-3">{s.staff_departments?.name || "—"}</td>
                  <td className="p-3">{s.staff_roles?.name || "—"}</td>
                  <td className="p-3">
                    <Badge variant={s.status === "active" ? "default" : s.status === "invited" ? "secondary" : "destructive"}>{s.status}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setEditing(s)}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => setTaskFor(s)}><ClipboardList className="h-3 w-3 mr-1" />Task</Button>
                      <Button size="sm" variant="outline" onClick={() => setMsgFor(s)}><MailPlus className="h-3 w-3 mr-1" />Msg</Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          const r = await staffAdmin({ action: "resend_invite", staff_id: s.id, site_url: window.location.origin });
                          setLastInviteUrl(r.activationUrl);
                          toast({ title: "Invitation regenerated" });
                        } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
                      }}><RotateCcw className="h-3 w-3" /></Button>
                      {s.status === "active" ? (
                        <Button size="sm" variant="destructive" onClick={async () => {
                          await staffAdmin({ action: "set_status", staff_id: s.id, status: "suspended" });
                          toast({ title: "Suspended" }); load();
                        }}><Ban className="h-3 w-3" /></Button>
                      ) : s.status === "suspended" ? (
                        <Button size="sm" onClick={async () => {
                          await staffAdmin({ action: "set_status", staff_id: s.id, status: "active" });
                          toast({ title: "Activated" }); load();
                        }}>Activate</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No staff yet. Click "Invite Staff" to create the first account.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      <StaffFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        roles={roles}
        depts={depts}
        onSaved={(url) => { if (url) setLastInviteUrl(url); load(); }}
      />
      {editing && (
        <StaffFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          roles={roles}
          depts={depts}
          existing={editing}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {taskFor && <TaskDialog staff={taskFor} onClose={() => setTaskFor(null)} />}
      {msgFor && <MessageDialog staff={msgFor} onClose={() => setMsgFor(null)} />}
    </AdminLayout>
  );
}

function StaffFormDialog({ open, onOpenChange, roles, depts, existing, onSaved }: any) {
  const [form, setForm] = useState<any>(existing ? {
    full_name: existing.full_name, email: existing.email, phone: existing.phone || "",
    department_id: existing.department_id || "", role_id: existing.role_id || "",
    monthly_salary: existing.monthly_salary || 0, joining_date: existing.joining_date || "",
  } : { full_name: "", email: "", phone: "", department_id: "", role_id: "", monthly_salary: 0, joining_date: "" });
  const [perms, setPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      (async () => {
        const { data } = await (await import("@/lib/firebaseAdapter")).supabase
          .from("staff_permissions").select("permission_key").eq("staff_id", existing.id);
        setPerms((data || []).map((p) => p.permission_key));
      })();
    } else setPerms([]);
  }, [existing]);

  const filteredRoles = form.department_id ? roles.filter((r: any) => r.department_id === form.department_id) : roles;

  const submit = async () => {
    setSaving(true);
    try {
      if (existing) {
        await staffAdmin({ action: "update_staff", staff_id: existing.id, updates: form, permissions: perms });
        toast({ title: "Staff updated" });
        onSaved();
      } else {
        const r = await staffAdmin({ action: "create_staff", ...form, permissions: perms, site_url: window.location.origin });
        toast({ title: "Staff invited", description: "Activation link generated." });
        onSaved(r.activationUrl);
      }
      onOpenChange(false);
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{existing ? "Edit Staff" : "Invite New Staff"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!existing} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v, role_id: "" })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{depts.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role_id} onValueChange={(v) => setForm({ ...form, role_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{filteredRoles.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Monthly salary (৳)</Label><Input type="number" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Joining date</Label><Input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} /></div>
        </div>
        <div>
          <Label className="mb-2 block">Extra permissions (on top of role defaults)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded p-3">
            {PERMISSION_CATALOG.map((g) => (
              <div key={g.group} className="col-span-full">
                <p className="text-xs font-semibold text-muted-foreground mt-2">{g.group}</p>
                {g.permissions.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-sm py-1">
                    <Checkbox checked={perms.includes(p.key)} onCheckedChange={(c) => {
                      setPerms(c ? [...perms, p.key] : perms.filter((x) => x !== p.key));
                    }} />
                    <span>{p.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{p.key}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{existing ? "Save changes" : "Send invitation"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({ staff, onClose }: any) {
  const [form, setForm] = useState({ title: "", description: "", priority: "normal", due_date: "" });
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign task to {staff.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !form.title} onClick={async () => {
            setSaving(true);
            try { await staffAdmin({ action: "assign_task", staff_id: staff.id, ...form }); toast({ title: "Task assigned" }); onClose(); }
            catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
            finally { setSaving(false); }
          }}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MessageDialog({ staff, onClose }: any) {
  const [form, setForm] = useState({ subject: "", body: "" });
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Message {staff.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>Message</Label><Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !form.subject} onClick={async () => {
            setSaving(true);
            try { await staffAdmin({ action: "send_message", staff_id: staff.id, ...form }); toast({ title: "Message sent" }); onClose(); }
            catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
            finally { setSaving(false); }
          }}><Send className="h-4 w-4 mr-2" />Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
