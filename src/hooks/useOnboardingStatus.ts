import { useMemo } from "react";
import { useTrailers } from "@/hooks/useTrailers";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useInventoryItems } from "@/hooks/useInventory";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useBookings } from "@/hooks/useBookings";
import { useOrg } from "@/contexts/OrgContext";

export function useOnboardingStatus() {
  const { currentOrg } = useOrg();
  const { data: trailers } = useTrailers();
  const { data: menuItems } = useMenuItems();
  const { data: inventory } = useInventoryItems();
  const { data: staff } = useStaffMembers();
  const { data: bookings } = useBookings();

  const completedSteps = useMemo(() => {
    const org = currentOrg as any;
    return {
      trailers: (trailers?.length || 0) > 0,
      tax: org?.tax_percent > 0 || org?.surcharge_enabled === true,
      menu: (menuItems?.length || 0) > 0,
      inventory: (inventory?.length || 0) > 0,
      staff: (staff?.length || 0) > 0,
      bookings: (bookings?.length || 0) > 0,
    };
  }, [trailers, menuItems, inventory, staff, bookings, currentOrg]);

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const totalSteps = Object.keys(completedSteps).length;
  const isComplete = completedCount === totalSteps;

  return { completedSteps, completedCount, totalSteps, isComplete };
}
