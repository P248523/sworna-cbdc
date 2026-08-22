import * as React from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AppShell({
  title,
  subtitle,
  nav,
  active,
  onNavigate,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  active: string;
  onNavigate: (key: string) => void;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="text-2xl font-bold text-primary">रू</span>
            <div>
              <p className="font-semibold leading-tight">Sworna CBDC</p>
              <p className="text-xs text-muted-foreground">{title}</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={active === item.key}
                      onClick={() => onNavigate(item.key)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user?.username}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
              </div>
              <Button variant="outline" size="icon" onClick={logout} aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-semibold">{title}</h1>
          {subtitle && <span className="text-xs text-muted-foreground">— {subtitle}</span>}
        </header>
        <div className="p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}