import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Users2, Mail, Phone } from "lucide-react";
import { usePublicFacilityStaff } from "@/hooks/useFacilityStaff";
import { cn } from "@/lib/utils";

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
    <section className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 ring-1 ring-indigo-500/20">
          <Users2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Our Team</h2>
          <p className="text-xs text-muted-foreground">Meet the people who make a difference</p>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {staff.map((member, index) => (
          <Card 
            key={member.id} 
            className={cn(
              "group relative overflow-hidden border-border/60",
              "bg-gradient-to-b from-card to-muted/30",
              "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
              "transition-all duration-300 ease-out"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Decorative accent line */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <CardContent className="p-5">
              <div className="flex flex-col items-center text-center">
                {/* Avatar with hover effect */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Avatar className={cn(
                    "h-24 w-24 ring-2 ring-border/50",
                    "group-hover:ring-primary/30 group-hover:scale-105",
                    "transition-all duration-300 ease-out"
                  )}>
                    <AvatarImage 
                      src={member.photo_url} 
                      alt={member.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-muted to-muted/80 text-muted-foreground text-xl font-medium">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name */}
                <h3 className="font-semibold text-base line-clamp-1 text-foreground">
                  {member.name}
                </h3>

                {/* Job Title */}
                <p className="text-sm text-primary/80 font-medium mt-0.5 line-clamp-1">
                  {member.job_title}
                </p>

                {/* Bio */}
                {member.bio && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-3 leading-relaxed">
                    {member.bio}
                  </p>
                )}

                {/* Contact Info */}
                {(member.email || member.phone) && (
                  <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-border/50 w-full">
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className={cn(
                          "p-2 rounded-lg bg-muted/50 text-muted-foreground",
                          "hover:bg-primary/10 hover:text-primary",
                          "transition-colors duration-200"
                        )}
                        title={`Email ${member.name}`}
                      >
                        <Mail className="h-4 w-4" />
                        <span className="sr-only">Email {member.name}</span>
                      </a>
                    )}
                    {member.phone && (
                      <a
                        href={`tel:${member.phone}`}
                        className={cn(
                          "p-2 rounded-lg bg-muted/50 text-muted-foreground",
                          "hover:bg-primary/10 hover:text-primary",
                          "transition-colors duration-200"
                        )}
                        title={`Call ${member.name}`}
                      >
                        <Phone className="h-4 w-4" />
                        <span className="sr-only">Call {member.name}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
