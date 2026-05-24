import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useFacilityPrograms,
  PROGRAM_LEVELS_OF_CARE,
  type FacilityProgram,
} from "@/hooks/useFacilityPrograms";

interface ProgramsManagementSectionProps {
  facilityId: string;
  isPro: boolean;
}

const NAME_MAX = 80;
const DESC_MAX = 1000;
const LENGTH_MAX = 60;

/**
 * Manages the facility_programs CRUD UI. Pro-only on the public profile
 * (the public_facility_programs view enforces this server-side); Free
 * providers can still author programs here so they don't need to start
 * from a blank slate after upgrading.
 */
export function ProgramsManagementSection({ facilityId, isPro }: ProgramsManagementSectionProps) {
  const { programs, isLoading, createProgram, updateProgram, deleteProgram } =
    useFacilityPrograms(facilityId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FacilityProgram | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FacilityProgram | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [levelOfCare, setLevelOfCare] = useState<string>("");
  const [lengthText, setLengthText] = useState("");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setLevelOfCare("");
    setLengthText("");
    setDialogOpen(true);
  };

  const openEdit = (row: FacilityProgram) => {
    setEditing(row);
    setName(row.name);
    setDescription(row.description);
    setLevelOfCare(row.level_of_care || "");
    setLengthText(row.length_text || "");
    setDialogOpen(true);
  };

  const canSave =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    name.length <= NAME_MAX &&
    description.length <= DESC_MAX;

  const handleSave = async () => {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      level_of_care: levelOfCare.trim() || null,
      length_text: lengthText.trim() || null,
    };
    if (editing) {
      await updateProgram.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createProgram.mutateAsync({ ...payload, facility_id: facilityId });
    }
    setDialogOpen(false);
  };

  const handleMove = (row: FacilityProgram, direction: "up" | "down") => {
    const idx = programs.findIndex((p) => p.id === row.id);
    const swapWith = direction === "up" ? programs[idx - 1] : programs[idx + 1];
    if (!swapWith) return;
    // Two swaps so display_order stays unique-ish; the column has no
    // unique constraint, but we keep the values monotonic so the public
    // ordering stays deterministic.
    updateProgram.mutate({ id: row.id, data: { display_order: swapWith.display_order } });
    updateProgram.mutate({ id: swapWith.id, data: { display_order: row.display_order } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Programs</h2>
          <p className="text-sm text-muted-foreground">
            Showcase each treatment program your facility offers — clinical
            approach, level of care, and length of stay. Surfaces on your public
            profile for Pro facilities.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="shrink-0 gap-1.5 bg-[#1B365D] hover:bg-[#142a4a]">
          <Plus className="h-4 w-4" />
          Add program
        </Button>
      </div>

      {!isPro && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200/60 bg-amber-50/60 p-3 text-sm">
          <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <p className="text-amber-900 leading-relaxed">
            Programs are <strong>visible on your public profile only with Pro</strong>.
            You can still author them here so they go live the moment you
            upgrade — nothing is lost.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm font-medium text-foreground">No programs added yet</p>
          <p className="text-xs mt-1">
            Add your first program to give seekers a concrete picture of what
            you offer.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((row, idx) => (
            <div
              key={row.id}
              className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-start gap-3"
            >
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{row.name}</p>
                  {row.level_of_care && (
                    <Badge variant="secondary" className="text-xs">
                      {row.level_of_care}
                    </Badge>
                  )}
                  {row.length_text && (
                    <Badge variant="outline" className="text-xs">
                      {row.length_text}
                    </Badge>
                  )}
                  {!row.is_visible && (
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                      Hidden
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {row.description}
                </p>
              </div>
              <div className="flex items-center gap-1 sm:flex-col sm:items-end shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMove(row, "up")}
                  disabled={idx === 0}
                  aria-label="Move program up"
                  className="h-8 w-8"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMove(row, "down")}
                  disabled={idx === programs.length - 1}
                  aria-label="Move program down"
                  className="h-8 w-8"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    updateProgram.mutate({ id: row.id, data: { is_visible: !row.is_visible } })
                  }
                  aria-label={row.is_visible ? "Hide program" : "Show program"}
                  className="h-8 w-8"
                >
                  {row.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(row)}
                  aria-label="Edit program"
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDelete(row)}
                  aria-label="Delete program"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit program" : "Add a program"}</DialogTitle>
            <DialogDescription>
              Describe one treatment program at this facility. Add as many as
              you offer — seekers see these on your public profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="program-name">
                  Program name <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {name.length}/{NAME_MAX}
                </span>
              </div>
              <Input
                id="program-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                placeholder="e.g., Adult Residential Treatment"
                maxLength={NAME_MAX}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="program-loc">Level of care</Label>
                <Select value={levelOfCare} onValueChange={setLevelOfCare}>
                  <SelectTrigger id="program-loc">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAM_LEVELS_OF_CARE.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="program-length">Length of stay</Label>
                <Input
                  id="program-length"
                  value={lengthText}
                  onChange={(e) => setLengthText(e.target.value.slice(0, LENGTH_MAX))}
                  placeholder="e.g., 30 days, 90 days, ongoing"
                  maxLength={LENGTH_MAX}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="program-desc">
                  Description <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {description.length}/{DESC_MAX}
                </span>
              </div>
              <Textarea
                id="program-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                placeholder="Describe the clinical approach, who this program is for, and what a typical day looks like."
                rows={5}
                maxLength={DESC_MAX}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || createProgram.isPending || updateProgram.isPending}
              className="bg-[#1B365D] hover:bg-[#142a4a]"
            >
              {(createProgram.isPending || updateProgram.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editing ? "Save changes" : "Add program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this program?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" will be removed from your profile.
              Seekers viewing your listing will no longer see this program.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) deleteProgram.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
