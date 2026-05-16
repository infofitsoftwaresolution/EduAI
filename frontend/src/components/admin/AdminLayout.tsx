import type { ReactNode } from "react";
import AdminHeader from "../layout/AdminHeader";

interface AdminLayoutProps {
  children: ReactNode;
  onLogout: () => void;
  title?: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
}

function AdminLayout({
  children,
  onLogout,
  title,
  subtitle,
  backTo,
  backLabel,
}: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-[#050505] text-foreground overflow-hidden dark flex-col">
      <div className="absolute top-0 right-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <AdminHeader
        onLogout={onLogout}
        title={title}
        subtitle={subtitle}
        backTo={backTo}
        backLabel={backLabel}
      />

      <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-10 py-5 md:py-8 relative z-10">
        {children}
      </div>
    </div>
  );
}

export default AdminLayout;
