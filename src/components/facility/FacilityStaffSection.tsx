import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Users2 } from "lucide-react";
import { usePublicFacilityStaff } from "@/hooks/useFacilityStaff";

interface FacilityStaffSectionProps {
  facilityId: string;
}

export function FacilityStaffSection({ facilityId }: FacilityStaffSectionProps) {
  const { data: staff = [], isLoading } = usePublicFacilityStaff(facilityId);

  // Don't render if no staff or loading
  if (isLoading || staff.length === 0) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-indigo-500/10">
          <Users2 className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-semibold">Our Team</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {staff.map((member) => (
          <Card key={member.id} className="overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Avatar className="h-20 w-20 mx-auto mb-3 border-2 border-border group-hover:border-primary/30 transition-colors">
                <AvatarImage 
                  src={member.photo_url} 
                  alt={member.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-medium text-sm line-clamp-1">{member.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{member.job_title}</p>
              {member.bio && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{member.bio}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
