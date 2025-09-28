import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGuestSchema } from "@shared/schema";
import { z } from "zod";
import { Search, User, Phone, Mail, MapPin, Star, Plus, Edit3, History, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  dateOfBirth?: string;
  idType?: string;
  idNumber?: string;
  nationality?: string;
  preferences?: Record<string, any>;
  vipStatus: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface GuestProfile {
  guest: Guest;
  stayHistory: any[];
  totalStays: number;
  totalRevenue: number;
  lastStayDate?: string;
}

const guestFormSchema = insertGuestSchema.extend({
  dateOfBirth: z.string().optional(),
});

export default function Guests() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Search guests query
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/guests/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return null;
      const response = await fetch(`/api/guests/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    },
    enabled: !!searchQuery,
  });

  // Get guest profile with CRM data
  const { data: guestProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/guests", selectedGuest?.id, "profile"],
    queryFn: async () => {
      if (!selectedGuest) return null;
      const response = await fetch(`/api/guests/${selectedGuest.id}/profile`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    },
    enabled: !!selectedGuest,
  });

  // Form for creating/editing guests
  const form = useForm<z.infer<typeof guestFormSchema>>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      idType: "",
      idNumber: "",
      nationality: "",
      vipStatus: false,
      notes: "",
    },
  });

  // Create guest mutation
  const createGuestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof guestFormSchema>) => {
      const response = await fetch("/api/guests", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          preferences: {}
        })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Guest created successfully" });
      setShowCreateDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating guest", 
        description: error.message || "Failed to create guest",
        variant: "destructive" 
      });
    },
  });

  // Update guest mutation
  const updateGuestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof guestFormSchema>> }) => {
      const response = await fetch(`/api/guests/${id}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Guest updated successfully" });
      setShowEditDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      if (selectedGuest) {
        queryClient.invalidateQueries({ queryKey: ["/api/guests", selectedGuest.id, "profile"] });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating guest", 
        description: error.message || "Failed to update guest",
        variant: "destructive" 
      });
    },
  });

  const handleCreateGuest = (data: z.infer<typeof guestFormSchema>) => {
    createGuestMutation.mutate(data);
  };

  const handleUpdateGuest = (data: z.infer<typeof guestFormSchema>) => {
    if (selectedGuest) {
      updateGuestMutation.mutate({ id: selectedGuest.id, data });
    }
  };

  const openEditDialog = (guest: Guest) => {
    setSelectedGuest(guest);
    form.reset({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email || "",
      phone: guest.phone || "",
      address: guest.address || "",
      city: guest.city || "",
      state: guest.state || "",
      country: guest.country || "",
      postalCode: guest.postalCode || "",
      dateOfBirth: guest.dateOfBirth ? format(new Date(guest.dateOfBirth), "yyyy-MM-dd") : "",
      idType: guest.idType || "",
      idNumber: guest.idNumber || "",
      nationality: guest.nationality || "",
      vipStatus: guest.vipStatus,
      notes: guest.notes || "",
    });
    setShowEditDialog(true);
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-guests">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Guest Management</h1>
          <p className="text-muted-foreground">Manage guest profiles, preferences, and stay history</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-guest">
              <Plus className="h-4 w-4 mr-2" />
              New Guest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Guest</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateGuest)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} value={field.value || ''} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="vipStatus"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>VIP Status</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Mark as VIP guest for special treatment
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-vip-status"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} rows={3} data-testid="textarea-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createGuestMutation.isPending}
                    data-testid="button-save-guest"
                  >
                    {createGuestMutation.isPending ? "Creating..." : "Create Guest"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search guests by name, email, phone, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-guests"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Guest Directory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {searchLoading && (
                <div className="text-center py-4 text-muted-foreground">Searching...</div>
              )}
              {searchQuery && !searchLoading && (searchResults as any)?.guests?.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">No guests found</div>
              )}
              {!searchQuery && (
                <div className="text-center py-4 text-muted-foreground">
                  Enter a search term to find guests
                </div>
              )}
              {(searchResults as any)?.guests?.map((guest: Guest) => (
                <div
                  key={guest.id}
                  className={`p-3 rounded-lg border cursor-pointer hover-elevate transition-colors ${
                    selectedGuest?.id === guest.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedGuest(guest)}
                  data-testid={`card-guest-${guest.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">
                          {guest.firstName} {guest.lastName}
                        </h4>
                        {guest.vipStatus && (
                          <Badge variant="default" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            VIP
                          </Badge>
                        )}
                      </div>
                      {guest.email && (
                        <p className="text-xs text-muted-foreground mt-1">{guest.email}</p>
                      )}
                      {guest.phone && (
                        <p className="text-xs text-muted-foreground">{guest.phone}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(guest);
                      }}
                      data-testid={`button-edit-guest-${guest.id}`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Guest Profile */}
        <div className="lg:col-span-2">
          {!selectedGuest && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a guest to view their profile</p>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedGuest && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedGuest.firstName} {selectedGuest.lastName}
                        {selectedGuest.vipStatus && (
                          <Badge variant="default">
                            <Star className="h-3 w-3 mr-1" />
                            VIP
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Guest since {format(new Date(selectedGuest.createdAt), "MMM yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
                    <TabsTrigger value="history" data-testid="tab-history">Stay History</TabsTrigger>
                    <TabsTrigger value="preferences" data-testid="tab-preferences">Preferences</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="profile" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-medium">Contact Information</h4>
                        {selectedGuest.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span data-testid="text-guest-email">{selectedGuest.email}</span>
                          </div>
                        )}
                        {selectedGuest.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span data-testid="text-guest-phone">{selectedGuest.phone}</span>
                          </div>
                        )}
                        {(selectedGuest.address || selectedGuest.city) && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              {selectedGuest.address && <div>{selectedGuest.address}</div>}
                              {selectedGuest.city && (
                                <div>
                                  {selectedGuest.city}
                                  {selectedGuest.state && `, ${selectedGuest.state}`}
                                  {selectedGuest.country && `, ${selectedGuest.country}`}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium">Guest Statistics</h4>
                        {profileLoading ? (
                          <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : (guestProfile as any)?.profile && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Total Stays:</span>
                              <span className="font-medium" data-testid="text-total-stays">
                                {(guestProfile as any).profile.totalStays}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Total Revenue:</span>
                              <span className="font-medium" data-testid="text-total-revenue">
                                ${(guestProfile as any).profile.totalRevenue.toFixed(2)}
                              </span>
                            </div>
                            {(guestProfile as any).profile.lastStayDate && (
                              <div className="flex justify-between text-sm">
                                <span>Last Stay:</span>
                                <span className="font-medium" data-testid="text-last-stay">
                                  {format(new Date((guestProfile as any).profile.lastStayDate), "MMM dd, yyyy")}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <History className="h-5 w-5" />
                      <h4 className="font-medium">Stay History</h4>
                    </div>
                    {profileLoading ? (
                      <div className="text-center py-4 text-muted-foreground">Loading...</div>
                    ) : (guestProfile as any)?.profile?.stayHistory?.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No stays recorded</div>
                    ) : (
                      <div className="space-y-3">
                        {(guestProfile as any)?.profile?.stayHistory?.map((stay: any) => (
                          <div 
                            key={stay.id} 
                            className="border rounded-lg p-3"
                            data-testid={`card-stay-${stay.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {format(new Date(stay.arrivalDate), "MMM dd")} - {format(new Date(stay.departureDate), "MMM dd, yyyy")}
                                </span>
                                <Badge variant={
                                  stay.status === 'checked_out' ? 'secondary' :
                                  stay.status === 'checked_in' ? 'default' :
                                  stay.status === 'confirmed' ? 'outline' : 'destructive'
                                }>
                                  {stay.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <span className="font-medium">${parseFloat(stay.totalAmount).toFixed(2)}</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {stay.nights} night{stay.nights !== 1 ? 's' : ''} • Confirmation: {stay.confirmationNumber}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="preferences" className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-medium">Guest Preferences</h4>
                      {selectedGuest.preferences && Object.keys(selectedGuest.preferences).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(selectedGuest.preferences).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No preferences set</p>
                      )}
                      
                      {selectedGuest.notes && (
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">Notes</h5>
                          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                            {selectedGuest.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Guest Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Guest Profile</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateGuest)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value || ''} data-testid="input-edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-edit-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="vipStatus"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>VIP Status</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Mark as VIP guest for special treatment
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-vip-status"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                  data-testid="button-edit-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateGuestMutation.isPending}
                  data-testid="button-save-edit-guest"
                >
                  {updateGuestMutation.isPending ? "Updating..." : "Update Guest"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}