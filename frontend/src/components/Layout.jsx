import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Settings,
  X,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MobileMenu from "@/components/MobileMenu";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const SidebarContentInner = ({ location }) => {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Close sidebar on mobile when a link is clicked
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <SidebarHeader className="border-b border-border">
        <div className="flex h-16 items-center justify-between px-3">
          <div
            className={cn(
              "flex items-center gap-2 transition-all duration-200",
              isCollapsed
                ? "w-0 opacity-0 overflow-hidden"
                : "w-auto opacity-100"
            )}
          >
            <img
              src="/pingle logo.png"
              alt="Pingle Logo"
              className="h-50 w-50 object-contain max-w-full pt-2"
            />
          </div>
          {/* Close button for mobile sidebar */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpenMobile(false)}
              className="h-8 w-8 md:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              "transition-opacity",
              isCollapsed && "opacity-0 h-0 overflow-hidden"
            )}
          >
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={isCollapsed ? item.name : undefined}
                    >
                      <Link to={item.href} onClick={handleLinkClick}>
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border">
        <div
          className={cn(
            "px-3 py-4 transition-opacity",
            isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
          )}
        >
          <p className="text-xs text-muted-foreground">© 2025 Pingle Sign</p>
        </div>
      </SidebarFooter>
    </>
  );
};

const Layout = ({ children }) => {
  const location = useLocation();

  return (
    <SidebarProvider defaultOpen={true}>
      <MobileMenu />
      <Sidebar collapsible="icon" className="border-r">
        <SidebarContentInner location={location} />
      </Sidebar>
      <SidebarInset>
        <main className="flex-1 overflow-auto pt-16 md:pt-0 pb-4 md:pb-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
