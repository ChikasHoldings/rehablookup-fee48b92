import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import type { FacilityStaff } from "@/hooks/useFacilityStaff";

interface StaffCardProps {
  staff: FacilityStaff;
  onEdit: (staff: FacilityStaff) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  isDragging?: boolean;
}

export function StaffCard({
  staff,
  onEdit,
  onDelete,
  onToggleVisibility,
  isDragging,
}: StaffCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg border bg-card transition-all
        ${isDragging ? "shadow-lg ring-2 ring-primary/20" : "hover:bg-accent/50"}
        ${!staff.is_visible ? "opacity-60" : ""}
      `}
    >
      {/* Drag Handle */}
      <div className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Photo */}
      <Avatar className="h-12 w-12 border">
        <AvatarImage src={staff.photo_url} alt={staff.name} />
        <AvatarFallback className="bg-muted text-muted-foreground">
          {getInitials(staff.name)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{staff.name}</p>
          {!staff.is_visible && (
            <Badge variant="secondary" className="text-xs shrink-0">
              <EyeOff className="h-3 w-3 mr-1" />
              Hidden
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{staff.job_title}</p>
      </div>

      {/* Visibility Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={staff.is_visible}
          onCheckedChange={(checked) => onToggleVisibility(staff.id, checked)}
          aria-label={staff.is_visible ? "Hide from profile" : "Show on profile"}
        />
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card">
          <DropdownMenuItem onClick={() => onEdit(staff)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(staff.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
