import { memo } from "react";
import { Package, CheckCircle2, Truck, Home, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";

interface TimelineStep {
  status: OrderStatus;
  label: string;
  icon: React.ElementType;
  description?: string;
  date?: string;
}

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  orderDate?: string;
  confirmedDate?: string;
  shippedDate?: string;
  deliveredDate?: string;
  className?: string;
}

const statusOrder: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

const getSteps = (props: OrderTimelineProps): TimelineStep[] => {
  const { currentStatus, orderDate, confirmedDate, shippedDate, deliveredDate } = props;
  
  if (currentStatus === "cancelled") {
    return [
      { status: "pending", label: "Order Placed", icon: Package, date: orderDate },
      { status: "cancelled", label: "Cancelled", icon: XCircle, description: "Order was cancelled" },
    ];
  }

  if (currentStatus === "returned") {
    return [
      { status: "pending", label: "Order Placed", icon: Package, date: orderDate },
      { status: "confirmed", label: "Confirmed", icon: CheckCircle2, date: confirmedDate },
      { status: "shipped", label: "Shipped", icon: Truck, date: shippedDate },
      { status: "delivered", label: "Delivered", icon: Home, date: deliveredDate },
      { status: "returned", label: "Returned", icon: XCircle, description: "Item returned" },
    ];
  }

  return [
    { status: "pending", label: "Order Placed", icon: Package, description: "Order received", date: orderDate },
    { status: "confirmed", label: "Confirmed", icon: CheckCircle2, description: "Order confirmed by seller", date: confirmedDate },
    { status: "processing", label: "Processing", icon: Clock, description: "Preparing for shipment" },
    { status: "shipped", label: "Shipped", icon: Truck, description: "On the way", date: shippedDate },
    { status: "delivered", label: "Delivered", icon: Home, description: "Package delivered", date: deliveredDate },
  ];
};

const OrderTimelineComponent = (props: OrderTimelineProps) => {
  const { currentStatus, className } = props;
  const steps = getSteps(props);
  const currentIndex = steps.findIndex((step) => step.status === currentStatus);

  const getStepState = (index: number): "completed" | "current" | "upcoming" | "error" => {
    if (currentStatus === "cancelled" && index === steps.length - 1) return "error";
    if (currentStatus === "returned" && index === steps.length - 1) return "error";
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <div className={cn("relative", className)}>
      {/* Mobile: Vertical Timeline */}
      <div className="md:hidden space-y-0">
        {steps.map((step, index) => {
          const state = getStepState(index);
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.status} className="flex gap-3">
              {/* Line and icon column */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    state === "completed" && "bg-primary border-primary text-primary-foreground",
                    state === "current" && "bg-primary/20 border-primary text-primary animate-pulse",
                    state === "upcoming" && "bg-muted border-muted-foreground/30 text-muted-foreground",
                    state === "error" && "bg-destructive/20 border-destructive text-destructive"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[40px]",
                      state === "completed" ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>

              {/* Content column */}
              <div className={cn("pb-6", isLast && "pb-0")}>
                <p
                  className={cn(
                    "font-medium",
                    state === "completed" && "text-foreground",
                    state === "current" && "text-primary",
                    state === "upcoming" && "text-muted-foreground",
                    state === "error" && "text-destructive"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
                {step.date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(step.date).toLocaleDateString("en-BD", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Horizontal Timeline */}
      <div className="hidden md:block">
        <div className="relative flex justify-between">
          {/* Background line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted-foreground/20" />
          
          {/* Progress line */}
          <div
            className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
            style={{
              width: `${(currentIndex / (steps.length - 1)) * 100}%`,
            }}
          />

          {steps.map((step, index) => {
            const state = getStepState(index);
            const Icon = step.icon;

            return (
              <div key={step.status} className="flex flex-col items-center relative z-10 flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all bg-background",
                    state === "completed" && "bg-primary border-primary text-primary-foreground",
                    state === "current" && "bg-primary/20 border-primary text-primary animate-pulse",
                    state === "upcoming" && "bg-muted border-muted-foreground/30 text-muted-foreground",
                    state === "error" && "bg-destructive/20 border-destructive text-destructive"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p
                  className={cn(
                    "text-sm font-medium mt-2 text-center",
                    state === "completed" && "text-foreground",
                    state === "current" && "text-primary",
                    state === "upcoming" && "text-muted-foreground",
                    state === "error" && "text-destructive"
                  )}
                >
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(step.date).toLocaleDateString("en-BD", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const OrderTimeline = memo(OrderTimelineComponent);
