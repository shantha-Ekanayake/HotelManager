import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Loader2, Sunrise, Sunset } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface StayAdjustmentDialogProps {
  reservationId: string;
  confirmationNumber: string;
  currentStatus: string;
  onComplete?: () => void;
}

export default function StayAdjustmentDialog({ 
  reservationId, 
  confirmationNumber,
  currentStatus,
  onComplete 
}: StayAdjustmentDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"early_checkin" | "late_checkout">("early_checkin");
  const [additionalCharge, setAdditionalCharge] = useState("0");
  const [notes, setNotes] = useState("");

  const adjustmentMutation = useMutation({
    mutationFn: async (data: { adjustmentType: string; additionalCharge: string; notes: string }) => {
      return await apiRequest(`/api/reservations/${reservationId}/stay-adjustment`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Adjustment Applied",
        description: data.message || "Stay adjustment has been recorded",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/arrivals-today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/departures-today"] });
      setOpen(false);
      setAdditionalCharge("0");
      setNotes("");
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Adjustment Failed",
        description: error.message || "Failed to apply stay adjustment",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustmentMutation.mutate({ adjustmentType, additionalCharge, notes });
  };

  const canEarlyCheckin = currentStatus === "confirmed" || currentStatus === "pending";
  const canLateCheckout = currentStatus === "checked_in";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-adjust-stay-${reservationId}`}>
          <Clock className="h-4 w-4 mr-1" />
          Adjust
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Stay Adjustment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Reservation</p>
            <p className="font-medium">{confirmationNumber}</p>
          </div>

          <Tabs value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="early_checkin" 
                disabled={!canEarlyCheckin}
                data-testid="tab-early-checkin"
              >
                <Sunrise className="h-4 w-4 mr-1" />
                Early Check-in
              </TabsTrigger>
              <TabsTrigger 
                value="late_checkout" 
                disabled={!canLateCheckout}
                data-testid="tab-late-checkout"
              >
                <Sunset className="h-4 w-4 mr-1" />
                Late Check-out
              </TabsTrigger>
            </TabsList>

            <TabsContent value="early_checkin" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Allow guest to check in before the standard check-in time.
              </p>
            </TabsContent>

            <TabsContent value="late_checkout" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Allow guest to check out after the standard checkout time.
              </p>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="additionalCharge">Additional Charge ($)</Label>
            <Input
              id="additionalCharge"
              type="number"
              min="0"
              step="0.01"
              value={additionalCharge}
              onChange={(e) => setAdditionalCharge(e.target.value)}
              placeholder="0.00"
              data-testid="input-additional-charge"
            />
            <p className="text-xs text-muted-foreground">
              Leave at 0 for complimentary adjustment
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for adjustment..."
              rows={2}
              data-testid="textarea-adjustment-notes"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={adjustmentMutation.isPending}
              data-testid="button-confirm-adjustment"
            >
              {adjustmentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Apply Adjustment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
