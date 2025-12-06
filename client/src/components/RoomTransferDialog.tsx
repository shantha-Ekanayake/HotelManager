import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Room, RoomType } from "@shared/schema";

interface RoomTransferDialogProps {
  reservationId: string;
  currentRoomId?: string;
  guestName: string;
  onComplete?: () => void;
}

export default function RoomTransferDialog({ 
  reservationId, 
  currentRoomId, 
  guestName,
  onComplete 
}: RoomTransferDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [reason, setReason] = useState("");

  const { data: roomsData, isLoading: roomsLoading } = useQuery<{ rooms: Room[] }>({
    queryKey: ["/api/front-desk/available-rooms"],
    enabled: open
  });

  const { data: roomTypesData } = useQuery<{ roomTypes: RoomType[] }>({
    queryKey: ["/api/properties/prop-demo/room-types"],
    enabled: open
  });

  const transferMutation = useMutation({
    mutationFn: async (data: { targetRoomId: string; reason: string }) => {
      return await apiRequest("POST", `/api/front-desk/reservations/${reservationId}/transfer`, data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Room Transfer Successful",
        description: data.message || "Guest has been transferred to the new room",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/current-guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/front-desk/available-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties/prop-demo/rooms"] });
      setOpen(false);
      setTargetRoomId("");
      setReason("");
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Transfer Failed",
        description: error.message || "Failed to transfer guest to new room",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetRoomId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a target room",
      });
      return;
    }

    transferMutation.mutate({ targetRoomId, reason });
  };

  const availableRooms = (roomsData?.rooms || []).filter(r => r.id !== currentRoomId);
  const roomTypes = roomTypesData?.roomTypes || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-transfer-${reservationId}`}>
          <ArrowRightLeft className="h-4 w-4 mr-1" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Room
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Guest</p>
            <p className="font-medium">{guestName}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetRoom">New Room *</Label>
            {roomsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available rooms...
              </div>
            ) : (
              <Select value={targetRoomId} onValueChange={setTargetRoomId}>
                <SelectTrigger data-testid="select-transfer-room">
                  <SelectValue placeholder="Select target room" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.length === 0 ? (
                    <SelectItem value="none" disabled>No rooms available</SelectItem>
                  ) : (
                    availableRooms.map((room) => {
                      const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
                      return (
                        <SelectItem key={room.id} value={room.id}>
                          Room {room.roomNumber} - {roomType?.name || "Standard"}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Transfer</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Guest request, maintenance issue, upgrade..."
              rows={2}
              data-testid="textarea-transfer-reason"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={transferMutation.isPending || !targetRoomId}
              data-testid="button-confirm-transfer"
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Confirm Transfer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
