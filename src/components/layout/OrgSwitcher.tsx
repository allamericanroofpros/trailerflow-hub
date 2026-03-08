import { Check, ChevronDown, Building2, FlaskConical } from "lucide-react";
import { useOrg } from "@/contexts/OrgContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const DEMO_ORG_ID = "de300000-0000-0000-0000-000000000001";

export function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const { currentOrg, memberships, switchOrg } = useOrg();
  const isDemo = currentOrg?.id === DEMO_ORG_ID;

  if (memberships.length <= 1 && !collapsed) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4 shrink-0 text-sidebar-muted" />
        <span className="text-xs font-medium text-sidebar-foreground truncate">
          {currentOrg?.name || "No Org"}
        </span>
        {isDemo && <DemoBadge />}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-sidebar-accent transition-colors",
            collapsed && "justify-center"
          )}
        >
          <Building2 className="h-4 w-4 shrink-0 text-sidebar-muted" />
          {!collapsed && (
            <>
              <span className="flex-1 text-xs font-medium text-sidebar-foreground truncate">
                {currentOrg?.name || "Select Org"}
              </span>
              {isDemo && <DemoBadge />}
              <ChevronDown className="h-3 w-3 text-sidebar-muted shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch Organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => {
          const org = m.organization;
          const isDemoOrg = org.id === DEMO_ORG_ID;
          return (
            <DropdownMenuItem
              key={org.id}
              onClick={() => switchOrg(org.id)}
              className="flex items-center gap-2"
            >
              {isDemoOrg ? (
                <FlaskConical className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              ) : (
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1 truncate">{org.name}</span>
              {isDemoOrg && (
                <span className="text-[10px] font-medium text-amber-500 bg-amber-500/10 rounded px-1.5 py-0.5">
                  DEMO
                </span>
              )}
              {currentOrg?.id === org.id && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DemoBadge() {
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 rounded px-1.5 py-0.5 shrink-0">
      <FlaskConical className="h-2.5 w-2.5" />
      DEMO
    </span>
  );
}

export function DemoBanner() {
  const { currentOrg } = useOrg();
  if (currentOrg?.id !== DEMO_ORG_ID) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium px-4 py-1.5 text-center">
      <FlaskConical className="inline h-3 w-3 mr-1 -mt-0.5" />
      You are viewing <strong>demo data</strong>. Changes here won't affect your real business.
    </div>
  );
}

export { DEMO_ORG_ID };
