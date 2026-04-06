import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Users2, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { ListingSectionHeader } from "./ListingSectionHeader";
import { StaffCard } from "./StaffCard";
import { StaffFormModal } from "./StaffFormModal";
import { useFacilityStaff, type FacilityStaff, type CreateStaffData, type UpdateStaffData } from "@/hooks/useFacilityStaff";
import { useProStatus } from "@/hooks/useProStatus";

interface StaffManagementSectionProps {
  facilityId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function StaffManagementSection({
  facilityId,
  isExpanded,
  onToggle,
}: StaffManagementSectionProps) {
  const { data: proStatus } = useProStatus();
  const { 
    staff, 
    isLoading, 
    createStaff, 
    updateStaff, 
    deleteStaff,
  } = useFacilityStaff(facilityId);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<FacilityStaff | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; isOpen: boolean }>({ id: "", isOpen: false });

  // Get staff limit based on Pro status
  const isPro = proStatus?.isPro || false;
  const staffLimit = isPro ? 10 : 3;
  const canAddStaff = staff.length < staffLimit;

  const handleAddClick = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (staffMember: FacilityStaff) => {
    setEditingStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: CreateStaffData | { id: string; data: UpdateStaffData }) => {
    if ("id" in data) {
      updateStaff.mutate(data, {
        onSuccess: () => setIsModalOpen(false),
      });
    } else {
      createStaff.mutate(data, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.id) {
      deleteStaff.mutate(deleteConfirm.id);
    }
    setDeleteConfirm({ id: "", isOpen: false });
  };

  const handleToggleVisibility = (id: string, isVisible: boolean) => {
    updateStaff.mutate({ id, data: { is_visible: isVisible } });
  };

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <Card className="border-border/60 shadow-sm">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-4 bg-gradient-to-r from-indigo-500/5 to-transparent cursor-pointer hover:bg-indigo-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <ListingSectionHeader
                  icon={Users2}
                  iconColor="bg-indigo-500/10 text-indigo-600"
                  title="Our Team"
                  description="Add staff and team members to your profile"
                  badge={
                    <>
                      {staff.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {staff.length}/{staffLimit} member{staff.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {!isPro && (
                        <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
                          <Lock className="h-3 w-3 mr-1" />
                          Pro for more
                        </Badge>
                      )}
                    </>
                  }
                />
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Staff List */}
                  {staff.length > 0 ? (
                    <div className="space-y-2">
                      {staff.map((member) => (
                        <StaffCard
                          key={member.id}
                          staff={member}
                          onEdit={handleEditClick}
                          onDelete={(id) => setDeleteConfirm({ id, isOpen: true })}
                          onToggleVisibility={handleToggleVisibility}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No team members added yet</p>
                      <p className="text-sm">Add your first team member to showcase your staff</p>
                    </div>
                  )}

                  {/* Add Button */}
                  {canAddStaff ? (
                    <Button
                      variant="outline"
                      onClick={handleAddClick}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Team Member
                    </Button>
                  ) : (
                    <Alert className="bg-muted/50">
                      <AlertDescription className="text-sm text-muted-foreground">
                        You've reached the maximum of {staffLimit} team members.
                        {!isPro && (
                          <Link to="/provider/pro-upgrade" className="text-primary hover:underline ml-1">
                            Upgrade to Pro for up to 10 members.
                          </Link>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Add/Edit Modal */}
      <StaffFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        facilityId={facilityId}
        staff={editingStaff}
        onSubmit={handleSubmit}
        isSubmitting={createStaff.isPending || updateStaff.isPending}
        currentStaffCount={staff.length}
        maxStaff={staffLimit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this team member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
