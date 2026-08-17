import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Package,
  Loader2,
  Check,
  X,
  Eye,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

type ConsignmentStatus = "pending" | "approved" | "received" | "rejected";

interface Consignment {
  id: string;
  consignment_number: string;
  quantity: number;
  status: ConsignmentStatus;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  seller: {
    id: string;
    shop_name: string;
    contact_email: string;
  } | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
  } | null;
  warehouse: {
    id: string;
    name: string;
  } | null;
}

const statusConfig: Record<ConsignmentStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-800" },
  received: { label: "Received", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
};

export default function AdminConsignments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [actionType, setActionType] = useState<"view" | "approve" | "reject" | "receive" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Fetch consignments (via admin-db to bypass RLS for custom admin session)
  const { data: consignmentsData, isLoading, refetch } = useQuery({
    queryKey: ["admin-consignments", search, statusFilter, currentPage, pageSize],
    queryFn: async () => {
      const filters: { col: string; op?: any; value: any }[] = [];
      if (statusFilter !== "all") filters.push({ col: "status", op: "eq", value: statusFilter });
      if (search) filters.push({ col: "consignment_number", op: "ilike", value: `%${search}%` });

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await adminDb.select<Consignment>("consignments", {
        columns: `
          id,
          consignment_number,
          quantity,
          status,
          admin_notes,
          rejection_reason,
          created_at,
          seller:sellers(id, shop_name, contact_email),
          product:products(id, name, sku),
          warehouse:warehouses(id, name)
        `,
        filters,
        orderBy: { col: "created_at", ascending: false },
        range: { from, to },
        count: true,
      } as any);

      if (error) throw error;
      return { consignments: (data as unknown as Consignment[]) || [], total: count || 0 };
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-consignments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consignments",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Update consignment mutation
  const updateConsignment = useMutation({
    mutationFn: async ({
      id,
      status,
      rejection_reason,
      admin_notes,
    }: {
      id: string;
      status: ConsignmentStatus;
      rejection_reason?: string;
      admin_notes?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      
      if (rejection_reason) updates.rejection_reason = rejection_reason;
      if (admin_notes) updates.admin_notes = admin_notes;
      
      if (status === "approved") {
        updates.approved_at = new Date().toISOString();
      } else if (status === "received") {
        updates.received_at = new Date().toISOString();
      }

      const { error } = await adminDb.update("consignments", updates, { id });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Consignment status updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-consignments"] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closeDialog = () => {
    setSelectedConsignment(null);
    setActionType(null);
    setRejectionReason("");
    setAdminNotes("");
  };

  const handleAction = () => {
    if (!selectedConsignment || !actionType) return;

    if (actionType === "approve") {
      updateConsignment.mutate({
        id: selectedConsignment.id,
        status: "approved",
        admin_notes: adminNotes,
      });
    } else if (actionType === "reject") {
      if (!rejectionReason.trim()) {
        toast({
          title: "Error",
          description: "Please provide a rejection reason",
          variant: "destructive",
        });
        return;
      }
      updateConsignment.mutate({
        id: selectedConsignment.id,
        status: "rejected",
        rejection_reason: rejectionReason,
        admin_notes: adminNotes,
      });
    } else if (actionType === "receive") {
      updateConsignment.mutate({
        id: selectedConsignment.id,
        status: "received",
        admin_notes: adminNotes,
      });
    }
  };

  const totalPages = Math.ceil((consignmentsData?.total || 0) / pageSize);

  return (
    <AdminLayout title="Consignments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Consignment Management</h1>
            <p className="text-muted-foreground">
              Review and manage seller consignment requests
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              refetch();
              toast({ title: "Syncing...", description: "Fetching latest consignments" });
            }}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["pending", "approved", "received", "rejected"] as ConsignmentStatus[]).map((status) => (
            <div
              key={status}
              className="p-4 border rounded-lg bg-card cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
            >
              <div className={`inline-flex px-2 py-1 rounded text-xs font-medium ${statusConfig[status].color}`}>
                {statusConfig[status].label}
              </div>
              <p className="mt-2 text-2xl font-bold">
                {consignmentsData?.consignments.filter((c) => c.status === status).length || 0}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by consignment number..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Consignment #</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : consignmentsData?.consignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">No consignments found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                consignmentsData?.consignments.map((consignment) => (
                  <TableRow key={consignment.id}>
                    <TableCell className="font-mono text-sm">
                      {consignment.consignment_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{consignment.seller?.shop_name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">
                          {consignment.seller?.contact_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium line-clamp-1">
                          {consignment.product?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {consignment.product?.sku || "N/A"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {consignment.quantity}
                    </TableCell>
                    <TableCell>{consignment.warehouse?.name || "N/A"}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[consignment.status].color}>
                        {statusConfig[consignment.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(consignment.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedConsignment(consignment);
                            setActionType("view");
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {consignment.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary/80 hover:bg-primary/10"
                              onClick={() => {
                                setSelectedConsignment(consignment);
                                setActionType("approve");
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedConsignment(consignment);
                                setActionType("reject");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {consignment.status === "approved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary/80 hover:bg-primary/10"
                            onClick={() => {
                              setSelectedConsignment(consignment);
                              setActionType("receive");
                            }}
                          >
                            <PackageCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to{" "}
              {Math.min(currentPage * pageSize, consignmentsData?.total || 0)} of{" "}
              {consignmentsData?.total} results
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Action Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => closeDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {actionType === "view" && "Consignment Details"}
                {actionType === "approve" && "Approve Consignment"}
                {actionType === "reject" && "Reject Consignment"}
                {actionType === "receive" && "Mark as Received"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve" && "Approve this consignment request."}
                {actionType === "reject" && "Reject this consignment request with a reason."}
                {actionType === "receive" && "Mark this consignment as received at warehouse."}
              </DialogDescription>
            </DialogHeader>

            {selectedConsignment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Consignment #</p>
                    <p className="font-mono font-medium">{selectedConsignment.consignment_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-medium">{selectedConsignment.quantity} units</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Product</p>
                    <p className="font-medium">{selectedConsignment.product?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Warehouse</p>
                    <p className="font-medium">{selectedConsignment.warehouse?.name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Seller</p>
                    <p className="font-medium">{selectedConsignment.seller?.shop_name}</p>
                  </div>
                </div>

                {actionType === "reject" && (
                  <div className="space-y-2">
                    <Label>Rejection Reason *</Label>
                    <Textarea
                      placeholder="Enter reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                )}

                {actionType !== "view" && (
                  <div className="space-y-2">
                    <Label>Admin Notes (Optional)</Label>
                    <Textarea
                      placeholder="Add any notes..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                {actionType === "view" ? "Close" : "Cancel"}
              </Button>
              {actionType !== "view" && (
                <Button
                  onClick={handleAction}
                  disabled={updateConsignment.isPending}
                  variant={actionType === "reject" ? "destructive" : "default"}
                >
                  {updateConsignment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {actionType === "approve" && "Approve"}
                  {actionType === "reject" && "Reject"}
                  {actionType === "receive" && "Mark Received"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
