import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, Search, Package, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

type ConsignmentStatus = "pending" | "approved" | "received" | "rejected";

interface Consignment {
  id: string;
  consignment_number: string;
  quantity: number;
  status: ConsignmentStatus;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
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

const statusConfig: Record<ConsignmentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  received: { label: "Received", variant: "outline" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function SellerConsignments() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Get seller ID
  const { data: seller } = useQuery({
    queryKey: ["seller", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch consignments
  const { data: consignmentsData, isLoading, refetch } = useQuery({
    queryKey: ["seller-consignments", seller?.id, search, statusFilter, currentPage, pageSize],
    queryFn: async () => {
      if (!seller?.id) return { consignments: [], total: 0 };

      let query = supabase
        .from("consignments")
        .select(`
          id,
          consignment_number,
          quantity,
          status,
          admin_notes,
          rejection_reason,
          created_at,
          product:products(id, name, sku),
          warehouse:warehouses(id, name)
        `, { count: "exact" })
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search) {
        query = query.or(`consignment_number.ilike.%${search}%,product.name.ilike.%${search}%`);
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return { consignments: data as unknown as Consignment[], total: count || 0 };
    },
    enabled: !!seller?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!seller?.id) return;

    const channel = supabase
      .channel("seller-consignments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consignments",
          filter: `seller_id=eq.${seller.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [seller?.id, refetch]);

  const totalPages = Math.ceil((consignmentsData?.total || 0) / pageSize);

  const getProductImage = (product: Consignment["product"]) => {
    return "/placeholder.svg";
  };

  return (
    <SellerLayout title="Consignments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Consignments</h1>
            <p className="text-muted-foreground">
              Manage your warehouse consignment requests
            </p>
          </div>
          <Link to="/seller/consignments/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Consignment
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by consignment number or product..."
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

        {/* Desktop Table */}
        <div className="hidden md:block border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Consignment #</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : consignmentsData?.consignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">No consignments found</p>
                      <Link to="/seller/consignments/new">
                        <Button variant="outline" size="sm">
                          Create your first consignment
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                consignmentsData?.consignments.map((consignment) => (
                  <TableRow key={consignment.id}>
                    <TableCell>
                      <img
                        src={getProductImage(consignment.product)}
                        alt={consignment.product?.name || "Product"}
                        className="w-12 h-12 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium line-clamp-1">
                          {consignment.product?.name || "Unknown Product"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {consignment.product?.sku || "N/A"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {consignment.consignment_number}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {consignment.quantity}
                    </TableCell>
                    <TableCell>{consignment.warehouse?.name || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[consignment.status].variant}>
                        {statusConfig[consignment.status].label}
                      </Badge>
                      {consignment.rejection_reason && (
                        <p className="text-xs text-destructive mt-1">
                          {consignment.rejection_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(consignment.created_at), "dd MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : consignmentsData?.consignments.length === 0 ? (
            <div className="border rounded-lg py-10 flex flex-col items-center gap-2">
              <Package className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No consignments found</p>
              <Link to="/seller/consignments/new">
                <Button variant="outline" size="sm">
                  Create your first consignment
                </Button>
              </Link>
            </div>
          ) : (
            consignmentsData?.consignments.map((consignment) => (
              <div key={consignment.id} className="border rounded-lg p-3 flex gap-3">
                <img
                  src={getProductImage(consignment.product)}
                  alt={consignment.product?.name || "Product"}
                  className="w-14 h-14 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm line-clamp-1 flex-1">
                      {consignment.product?.name || "Unknown Product"}
                    </p>
                    <Badge variant={statusConfig[consignment.status].variant} className="flex-shrink-0 text-[10px]">
                      {statusConfig[consignment.status].label}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    {consignment.consignment_number}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Qty: <span className="font-semibold text-foreground">{consignment.quantity}</span></span>
                    <span className="truncate ml-2">{consignment.warehouse?.name || "N/A"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(consignment.created_at), "dd MMM yyyy")}
                  </p>
                  {consignment.rejection_reason && (
                    <p className="text-[10px] text-destructive line-clamp-2">
                      {consignment.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
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
      </div>
    </SellerLayout>
  );
}
