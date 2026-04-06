import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users2, Mail, Phone } from "lucide-react";
import { usePublicFacilityStaff } from "@/hooks/useFacilityStaff";
import { cn } from "@/lib/utils";

interface FacilityStaffSectionProps {
  facilityId: string;
}

export function FacilityStaffSection({ facilityId }: FacilityStaffSectionProps) {
  const { data: staff = [], isLoading } = usePublicFacilityStaff(facilityId);

  if (isLoading || staff.length === 0) {
    return null;
  }

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <section className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/15">
          <Users2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Our Team</h2>
          <p className="text-xs text-muted-foreground">Meet the people who make a difference</p>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {staff.map((member) => (
          <div
            key={member.id}
            className="group flex flex-col items-center text-center rounded-2xl bg-card border border-border/50 p-4 md:p-5 hover:border-primary/25 hover:shadow-md transition-all duration-200"
          >
            {/* Photo */}
            <Avatar className={cn(
              "h-20 w-20 md:h-24 md:w-24 ring-[3px] ring-background shadow-lg",
              "group-hover:ring-primary/20 transition-all duration-200"
            )}>
              <AvatarImage
                src={member.photo_url}
                alt={member.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg md:text-xl font-semibold">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <h3 className="mt-3 font-semibold text-sm md:text-base leading-tight line-clamp-1 text-foreground">
              {member.name}
            </h3>
            <span className="mt-0.5 text-xs md:text-sm font-medium text-primary/80 line-clamp-1">
              {member.job_title}
            </span>

            {member.bio && (
              <p className="mt-2 text-[11px] md:text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {member.bio}
              </p>
            )}

            {/* Contact icons */}
            {(member.email || member.phone) && (
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/40 w-full justify-center">
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    title={`Email ${member.name}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span className="sr-only">Email {member.name}</span>
                  </a>
                )}
                {member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    title={`Call ${member.name}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span className="sr-only">Call {member.name}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
