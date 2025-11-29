import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface NoShowDialogProps {
  reservationId: string;
  confirmationNumber: string;
  onComplete?: () => void;
}

export default function NoShowDialog({ 
  reservationId, 
  confirmationNumber,
  onComplete 
}: NoShowDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [chargeNoShowFee, setChargeNoShowFee] = useState(true);
  const [notes, setNotes] = useState("");

  const noShowMutation = useMutation({
    mutationFn: async (data: { chargeNoShowFee: boolean; notes: string }) => {
      return await apiRequest(`/api/reservations/${reservationId}/no-show`, {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "No-Show Recorded",
        description: data.message || "Reservation has been marked as no-show",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/arrivals-today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      setOpen(false);
      setNotes("");
      setChargeNoShowFee(true);
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "No-Show Failed",
        description: error.message || "Failed to mark reservation as no-show",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    noShowMutation.mutate({ chargeNoShowFee, notes });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" data-testid={`button-noshow-${reservationId}`}>
          <AlertTriangle className="h-4 w-4 mr-1" />
          No-Show
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Mark as No-Show
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium">Reservation: {confirmationNumber}</p>
            <p className="text-xs text-muted-foreground mt-1">
              This action will mark the reservation as no-show and release any held rooms.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="chargeNoShowFee"
              checked={chargeNoShowFee}
              onCheckedChange={(checked) => setChargeNoShowFee(checked as boolean)}
              data-testid="checkbox-noshow-fee"
            />
            <Label htmlFor="chargeNoShowFee" className="text-sm">
              Charge no-show fee (50% of total amount)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Attempted contact, reason if known..."
              rows={2}
              data-testid="textarea-noshow-notes"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={noShowMutation.isPending}
              data-testid="button-confirm-noshow"
            >
              {noShowMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Confirm No-Show
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
