import vfLogo from "@/assets/vf-monogram.png";
import { cn } from "@/lib/utils";
import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { img: "h-6 w-6", text: "text-sm" },
  md: { img: "h-8 w-8", text: "text-lg" },
  lg: { img: "h-10 w-10", text: "text-2xl" },
  xl: { img: "h-14 w-14", text: "text-3xl" },
};

export const BrandLogo = React.forwardRef<HTMLDivElement, BrandLogoProps>(
  ({ size = "md", showText = true, className }, ref) => {
    const s = sizes[size];
    return (
      <div ref={ref} className={cn("flex items-center gap-2.5", className)}>
        <img src={vfLogo} alt="VendorFlow" className={cn(s.img, "shrink-0 rounded-lg")} />
        {showText && (
          <span className={cn(s.text, "font-extrabold tracking-tight text-foreground")}>
            VendorFlow
          </span>
        )}
      </div>
    );
  }
);

BrandLogo.displayName = "BrandLogo";
