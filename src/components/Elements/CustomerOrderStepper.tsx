"use client";

import { Check, Clock, Package, Truck, CheckCircle2, XCircle } from "lucide-react";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_CONFIG,
  type OrderStatus,
} from "@/lib/constants";

const STATUS_ICONS = {
  "Pending Verification": Clock,
  Processing: Package,
  "Out for Delivery": Truck,
  Completed: CheckCircle2,
  Cancelled: XCircle,
} as const;

export function CustomerOrderStepper({ status }: { status: OrderStatus }) {
  const isCancelled = status === "Cancelled";
  const currentStep = ORDER_STATUS_CONFIG[status].step;

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
        <p className="text-sm font-semibold text-red-800">This order was cancelled</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-5 left-5 right-5 h-0.5 bg-white/40" />
      <div
        className="absolute top-5 left-5 h-0.5 bg-brand-charcoal transition-all duration-500"
        style={{
          width: `calc(${Math.max(0, currentStep) / (ORDER_STATUS_FLOW.length - 1)} * (100% - 2.5rem))`,
        }}
      />
      <div className="relative flex justify-between">
        {ORDER_STATUS_FLOW.map((stepStatus, i) => {
          const config = ORDER_STATUS_CONFIG[stepStatus];
          const Icon = STATUS_ICONS[stepStatus];
          const isComplete = currentStep > i;
          const isCurrent = status === stepStatus;

          return (
            <div key={stepStatus} className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  isCurrent
                    ? `${config.bg} ${config.text} border-current ring-4 ${config.ring} ring-offset-2`
                    : isComplete
                      ? "bg-brand-charcoal text-white border-brand-charcoal"
                      : "bg-white/60 text-brand-muted border-white/60"
                }`}
              >
                {isComplete && !isCurrent ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold text-center max-w-[4.5rem] leading-tight ${
                  isCurrent ? config.text : "text-brand-muted"
                }`}
              >
                {config.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
