import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MessageSquare, FileText, LogOut, Menu } from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", label: "Conversations", icon: MessageSquare },
  { path: "/templates", label: "Templates", icon: FileText },
];

const businesses = [
  { id: "feelori", name: "Feelori" },
  { id: "business_2", name: "Business 2" },
  { id: "business_3", name: "Business 3" },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { logout } = useAuth();
  const { businessId, setBusinessId } = useBusiness();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-sidebar-background border-r border-sidebar-border transition-all duration-200 flex flex-col",
          sidebarOpen ? "w-48" : "w-14"
        )}
      >
        {/* Logo */}
        <div className="h-12 flex items-center px-3 border-b border-sidebar-border">
          <MessageSquare className="h-5 w-5 text-sidebar-primary shrink-0" />
          {sidebarOpen && (
            <span className="ml-2 font-semibold text-sm text-sidebar-foreground truncate">
              Whisperer
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className={cn(
              "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50",
              !sidebarOpen && "justify-center px-2"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-12 border-b border-border bg-card flex items-center px-3 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          {/* Business Selector */}
          <Select value={businessId} onValueChange={setBusinessId}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {businesses.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
