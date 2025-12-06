import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ExpressCheckoutButtonProps {
  reservationId: string;
  confirmationNumber: string;
  onComplete?: () => void;
}

export default function ExpressCheckoutButton({ 
  reservationId, 
  confirmationNumber,
  onComplete 
}: ExpressCheckoutButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const expressCheckoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/reservations/${reservationId}/express-checkout`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Express Checkout Complete",
        description: data.message || "Guest has been checked out successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/current-guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/departures-today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties/prop-demo/rooms"] });
      setOpen(false);
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Express Checkout Failed",
        description: error.message || "Failed to complete express checkout",
      });
    }
  });

  const handleExpressCheckout = () => {
    expressCheckoutMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" data-testid={`button-express-checkout-${reservationId}`}>
          <Zap className="h-4 w-4 mr-1" />
          Express
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Express Checkout
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Reservation</p>
            <p className="font-medium">{confirmationNumber}</p>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Express checkout requires zero balance</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                If there's an outstanding balance, the checkout will fail and you'll need to use the regular checkout process.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExpressCheckout}
              disabled={expressCheckoutMutation.isPending}
              data-testid="button-confirm-express-checkout"
            >
              {expressCheckoutMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Complete Checkout
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
