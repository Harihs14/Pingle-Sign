import React from "react";
import { Menu, X } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * MobileMenu Component
 * Hamburger menu button for mobile devices that toggles the sidebar
 * Includes a header bar to prevent content overlap
 */
const MobileMenu = ({ className }) => {
  const { toggleSidebar, openMobile } = useSidebar();
  const isMobile = useIsMobile();

  // Only show on mobile devices
  if (!isMobile) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b border-border shadow-sm md:hidden",
        className
      )}
    >
      <div className="flex h-full items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-10 w-10"
          aria-label="Toggle menu"
        >
          {openMobile ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
        <div className="ml-3 flex items-center">
          <img
            src="/pingle logo.png"
            alt="Pingle Logo"
            className="h-8 w-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
