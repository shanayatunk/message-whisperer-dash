import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageSquare, Radio, Package, LogOut, Menu, Settings2, MessageCircle } from "lucide-react";
import { BusinessSelector } from "@/components/cockpit/BusinessSelector";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/conversations", label: "Conversations", icon: MessageSquare },
  { path: "/broadcasts", label: "Broadcasts", icon: Radio },
  { path: "/packing", label: "Packing", icon: Package },
  { path: "/whatsapp-menu", label: "WhatsApp Menu", icon: MessageCircle },
  { path: "/ai-strings", label: "AI & Strings", icon: Settings2 },
];

const envLabel = import.meta.env.MODE === "development" ? "STAGING" : "PRODUCTION";
const envBadgeClass =
  import.meta.env.MODE === "development"
    ? "bg-yellow-500 text-black"
    : "bg-green-600 text-white";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-sidebar-background border-r border-sidebar-border transition-all duration-200 flex flex-col z-50",
          // Mobile: fixed drawer, hidden by default
          "fixed inset-y-0 left-0 md:relative",
          sidebarOpen ? "w-52 translate-x-0" : "w-52 -translate-x-full md:translate-x-0 md:w-14"
        )}
      >
        {/* Logo */}
        <div className="h-12 flex items-center px-3 border-b border-sidebar-border">
          <MessageSquare className="h-5 w-5 text-sidebar-primary shrink-0" />
          {sidebarOpen && (
            <span className="ml-2 font-semibold text-sm text-sidebar-foreground truncate">
              Message Whisperer
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {(sidebarOpen || window.innerWidth < 768) && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content - add left margin on desktop for collapsed sidebar */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-14">
        {/* Top Bar */}
        <header className="h-12 border-b border-border bg-card flex items-center px-2 sm:px-3 gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          {/* Environment Badge */}
          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full uppercase whitespace-nowrap ${envBadgeClass}`}>
            {envLabel}
          </span>

          {/* Business Selector */}
          <BusinessSelector />

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="h-8 gap-1 sm:gap-2 text-muted-foreground hover:text-foreground px-2 sm:px-3"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4">{children}</main>
      </div>
    </div>
  );
}
