import { ProviderActivityTimeline } from "@/components/admin/ProviderActivityTimeline";

interface ProviderActivityTabProps {
  facilityId: string;
  userId: string;
}

export function ProviderActivityTab({ facilityId, userId }: ProviderActivityTabProps) {
  return (
    <ProviderActivityTimeline facilityId={facilityId} userId={userId} />
  );
}
