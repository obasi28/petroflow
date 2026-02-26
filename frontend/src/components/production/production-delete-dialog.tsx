"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteProduction } from "@/hooks/use-production";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface ProductionDeleteDialogProps {
  wellId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDates: string[];
}

export function ProductionDeleteDialog({
  wellId,
  open,
  onOpenChange,
  selectedDates,
}: ProductionDeleteDialogProps) {
  const deleteMutation = useDeleteProduction(wellId);

  const sorted = [...selectedDates].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const handleDelete = () => {
    deleteMutation.mutate(
      { start_date: first, end_date: last },
      {
        onSuccess: () => {
          toast.success(`${selectedDates.length} record(s) deleted`);
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to delete records"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[hsl(0,72%,51%)]" />
            Delete Production Records
          </DialogTitle>
          <DialogDescription>
            This will permanently delete {selectedDates.length} production record(s)
            {selectedDates.length > 1 && ` from ${first} to ${last}`}.
            Any existing DCA analyses for this well will be invalidated.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 pt-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Records"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
