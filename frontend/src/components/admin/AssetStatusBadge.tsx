import { cn } from "../../lib/utils";
import type { AssetStatus } from "../../services/adminService";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface AssetStatusBadgeProps {
  status: AssetStatus;
}

function AssetStatusBadge({ status }: AssetStatusBadgeProps) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Ready
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-400">
      <AlertCircle className="w-3.5 h-3.5" />
      Failed
    </span>
  );
}

export function assetStatusClass(status: AssetStatus): string {
  return cn(
    status === "ready" && "border-emerald-500/20",
    status === "processing" && "border-amber-500/20",
    status === "failed" && "border-red-500/30 bg-red-500/5"
  );
}

export default AssetStatusBadge;
