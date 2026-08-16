import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaff } from "@/contexts/StaffContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StaffProfile() {
  const { staff, role, permissions } = useStaff();
  if (!staff) return null;
  return (
    <StaffLayout>
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      <Card className="p-6 space-y-3 max-w-2xl">
        <Row label="Name" value={staff.full_name} />
        <Row label="Email" value={staff.email} />
        <Row label="Phone" value={staff.phone || "—"} />
        <Row label="Department" value={role?.department_name || "—"} />
        <Row label="Role" value={role?.name || "—"} />
        <Row label="Dashboard" value={role?.dashboard_key || "—"} />
        <Row label="Joining date" value={staff.joining_date || "—"} />
        <Row label="Monthly salary" value={staff.monthly_salary ? `৳${staff.monthly_salary}` : "—"} />
        <div>
          <p className="text-xs text-muted-foreground mb-2">Assigned permissions</p>
          <div className="flex flex-wrap gap-2">
            {[...permissions].map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}
          </div>
        </div>
      </Card>
    </StaffLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
