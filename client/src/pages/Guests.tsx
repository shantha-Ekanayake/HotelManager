import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGuestSchema } from "@shared/schema";
import { z } from "zod";
import { Search, User, Phone, Mail, MapPin, Star, Plus, Edit3, History, Calendar, Tag, Shield, ShieldOff, Award, MessageSquare, Download, Trash2, GitMerge, Filter, Users, Crown, AlertTriangle } from "lucide-react";
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
  blacklistStatus?: boolean;
  blacklistReason?: string;
  loyaltyTier?: string;
  loyaltyPoints?: number;
  segment?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface GuestCommunication {
  id: string;
  guestId: string;
  type: string;
  direction: string;
  subject?: string;
  content: string;
  staffId?: string;
  createdAt: string;
}

const guestFormSchema = insertGuestSchema.extend({
  dateOfBirth: z.string().optional(),
});

const loyaltyTiers = ["none", "bronze", "silver", "gold", "platinum"];
const segments = ["leisure", "business", "corporate", "group", "travel_agent", "ota"];

export default function Guests() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [filterVip, setFilterVip] = useState<string>("all");
  const [filterLoyalty, setFilterLoyalty] = useState<string>("all");
  const [filterSegment, setFilterSegment] = useState<string>("all");
  const [newTag, setNewTag] = useState("");
  const [communicationForm, setCommunicationForm] = useState({ type: "email", direction: "outbound", subject: "", content: "" });
  const [mergeTargetId, setMergeTargetId] = useState("");

  // Get all guests
  const { data: allGuestsData, isLoading: guestsLoading } = useQuery({
    queryKey: ["/api/guests/all"],
  });

  // Search guests query
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/guests/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return null;
      const response = await fetch(`/api/guests/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hms_token')}` }
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
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hms_token')}` }
      });
      return response.json();
    },
    enabled: !!selectedGuest,
  });

  // Get guest communications
  const { data: communicationsData } = useQuery({
    queryKey: ["/api/guests", selectedGuest?.id, "communications"],
    queryFn: async () => {
      if (!selectedGuest) return null;
      const response = await fetch(`/api/guests/${selectedGuest.id}/communications`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hms_token')}` }
      });
      return response.json();
    },
    enabled: !!selectedGuest,
  });

  // Filter guests
  const filteredGuests = (() => {
    const guests = searchQuery 
      ? (searchResults as any)?.guests 
      : (allGuestsData as any)?.guests;
    
    if (!guests) return [];
    
    return guests.filter((g: Guest) => {
      if (filterVip === "vip" && !g.vipStatus) return false;
      if (filterVip === "blacklist" && !g.blacklistStatus) return false;
      if (filterLoyalty !== "all" && g.loyaltyTier !== filterLoyalty) return false;
      if (filterSegment !== "all" && g.segment !== filterSegment) return false;
      return true;
    });
  })();

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
      return apiRequest("POST", "/api/guests", {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        preferences: {},
        loyaltyTier: "none",
        loyaltyPoints: 0,
        segment: "leisure",
        tags: [],
        blacklistStatus: false
      });
    },
    onSuccess: () => {
      toast({ title: "Guest created successfully" });
      setShowCreateDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/guests/all"] });
    },
    onError: (error: any) => {
      toast({ title: "Error creating guest", description: error.message, variant: "destructive" });
    },
  });

  // Update guest mutation
  const updateGuestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof guestFormSchema>> }) => {
      return apiRequest("PUT", `/api/guests/${id}`, {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Guest updated successfully" });
      setShowEditDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/guests/all"] });
      if (selectedGuest) {
        queryClient.invalidateQueries({ queryKey: ["/api/guests", selectedGuest.id, "profile"] });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error updating guest", description: error.message, variant: "destructive" });
    },
  });

  // Update loyalty mutation
  const updateLoyaltyMutation = useMutation({
    mutationFn: async ({ id, loyaltyTier, loyaltyPoints }: { id: string; loyaltyTier: string; loyaltyPoints: number }) => {
      return apiRequest("PUT", `/api/guests/${id}/loyalty`, { loyaltyTier, loyaltyPoints });
    },
    onSuccess: () => {
      toast({ title: "Loyalty tier updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/all"] });
    },
  });

  // Update blacklist mutation
  const updateBlacklistMutation = useMutation({
    mutationFn: async ({ id, blacklistStatus, blacklistReason }: { id: string; blacklistStatus: boolean; blacklistReason?: string }) => {
      return apiRequest("PUT", `/api/guests/${id}/blacklist`, { blacklistStatus, blacklistReason });
    },
    onSuccess: () => {
      toast({ title: "Blacklist status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/all"] });
    },
  });

  // Update tags mutation
  const updateTagsMutation = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      return apiRequest("PUT", `/api/guests/${id}/tags`, { tags });
    },
    onSuccess: () => {
      toast({ title: "Tags updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/all"] });
    },
  });

  // Update segment mutation
  const updateSegmentMutation = useMutation({
    mutationFn: async ({ id, segment }: { id: string; segment: string }) => {
      return apiRequest("PUT", `/api/guests/${id}/segment`, { segment });
    },
    onSuccess: () => {
      toast({ title: "Segment updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/all"] });
    },
  });

  // Add communication mutation
  const addCommunicationMutation = useMutation({
    mutationFn: async ({ guestId, data }: { guestId: string; data: typeof communicationForm }) => {
      return apiRequest("POST", `/api/guests/${guestId}/communications`, data);
    },
    onSuccess: () => {
      toast({ title: "Communication logged" });
      setShowCommunicationDialog(false);
      setCommunicationForm({ type: "email", direction: "outbound", subject: "", content: "" });
      if (selectedGuest) {
        queryClient.invalidateQueries({ queryKey: ["/api/guests", selectedGuest.id, "communications"] });
      }
    },
  });

  // Export guest data mutation
  const exportGuestMutation = useMutation({
    mutationFn: async (guestId: string) => {
      const response = await fetch(`/api/guests/${guestId}/export`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hms_token')}` }
      });
      return response.json();
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guest-data-${selectedGuest?.id}.json`;
      a.click();
      toast({ title: "Guest data exported" });
    },
  });

  // Delete guest mutation
  const deleteGuestMutation = useMutation({
    mutationFn: async (guestId: string) => {
      return apiRequest("DELETE", `/api/guests/${guestId}`);
    },
    onSuccess: () => {
      toast({ title: "Guest data anonymized successfully" });
      setSelectedGuest(null);
      queryClient.invalidateQueries({ queryKey: ["/api/guests/all"] });
    },
  });

  // Merge guests mutation
  const mergeGuestsMutation = useMutation({
    mutationFn: async ({ primaryGuestId, duplicateGuestId }: { primaryGuestId: string; duplicateGuestId: string }) => {
      return apiRequest("POST", "/api/guests/merge", { primaryGuestId, duplicateGuestId });
    },
    onSuccess: () => {
      toast({ title: "Guests merged successfully" });
      setShowMergeDialog(false);
      setMergeTargetId("");
      queryClient.invalidateQueries({ queryKey: ["/api/guests/all"] });
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

  const addTag = () => {
    if (newTag && selectedGuest) {
      const currentTags = (selectedGuest.tags as string[]) || [];
      if (!currentTags.includes(newTag)) {
        updateTagsMutation.mutate({ id: selectedGuest.id, tags: [...currentTags, newTag] });
      }
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (selectedGuest) {
      const currentTags = (selectedGuest.tags as string[]) || [];
      updateTagsMutation.mutate({ id: selectedGuest.id, tags: currentTags.filter(t => t !== tagToRemove) });
    }
  };

  const getLoyaltyBadgeColor = (tier?: string) => {
    switch (tier) {
      case "platinum": return "bg-slate-300 text-slate-900";
      case "gold": return "bg-yellow-400 text-yellow-900";
      case "silver": return "bg-gray-300 text-gray-900";
      case "bronze": return "bg-orange-400 text-orange-900";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-guests">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Guest Management</h1>
          <p className="text-muted-foreground">Manage guest profiles, loyalty, preferences, and communication</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-guest">
              <Plus className="h-4 w-4 mr-2" />
              New Guest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Guest</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateGuest)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-first-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-last-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} value={field.value || ''} data-testid="input-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} data-testid="input-phone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} data-testid="input-address" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} data-testid="input-city" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} data-testid="input-state" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} data-testid="input-country" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="idType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Type</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} placeholder="Passport, Driver License..." data-testid="input-id-type" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="idNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Number</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} data-testid="input-id-number" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="vipStatus" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>VIP Status</FormLabel>
                      <div className="text-sm text-muted-foreground">Mark as VIP guest</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-vip-status" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} value={field.value || ''} rows={3} data-testid="textarea-notes" /></FormControl>
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} data-testid="button-cancel">Cancel</Button>
                  <Button type="submit" disabled={createGuestMutation.isPending} data-testid="button-save-guest">
                    {createGuestMutation.isPending ? "Creating..." : "Create Guest"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guests by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-guests"
          />
        </div>
        <Select value={filterVip} onValueChange={setFilterVip}>
          <SelectTrigger className="w-36" data-testid="select-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="vip">VIP Only</SelectItem>
            <SelectItem value="blacklist">Blacklisted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterLoyalty} onValueChange={setFilterLoyalty}>
          <SelectTrigger className="w-36" data-testid="select-filter-loyalty">
            <SelectValue placeholder="Loyalty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {loyaltyTiers.map(tier => (
              <SelectItem key={tier} value={tier}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSegment} onValueChange={setFilterSegment}>
          <SelectTrigger className="w-36" data-testid="select-filter-segment">
            <SelectValue placeholder="Segment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            {segments.map(seg => (
              <SelectItem key={seg} value={seg}>{seg.charAt(0).toUpperCase() + seg.slice(1).replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold" data-testid="stat-total-guests">{(allGuestsData as any)?.guests?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Guests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="stat-vip-guests">
                {(allGuestsData as any)?.guests?.filter((g: Guest) => g.vipStatus).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">VIP Guests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-8 w-8 text-slate-400" />
            <div>
              <p className="text-2xl font-bold" data-testid="stat-platinum-guests">
                {(allGuestsData as any)?.guests?.filter((g: Guest) => g.loyaltyTier === "platinum" || g.loyaltyTier === "gold").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Gold/Platinum</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold" data-testid="stat-blacklist-guests">
                {(allGuestsData as any)?.guests?.filter((g: Guest) => g.blacklistStatus).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Blacklisted</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest List */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-400px)] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Guest Directory
                <Badge variant="secondary">{filteredGuests.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2">
              {(guestsLoading || searchLoading) && (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              )}
              {!guestsLoading && !searchLoading && filteredGuests.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">No guests found</div>
              )}
              {filteredGuests.map((guest: Guest) => (
                <div
                  key={guest.id}
                  className={`p-3 rounded-lg border cursor-pointer hover-elevate transition-colors ${
                    selectedGuest?.id === guest.id ? 'bg-accent border-primary' : ''
                  } ${guest.blacklistStatus ? 'border-destructive/50' : ''}`}
                  onClick={() => setSelectedGuest(guest)}
                  data-testid={`card-guest-${guest.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm truncate">
                          {guest.firstName} {guest.lastName}
                        </h4>
                        {guest.vipStatus && (
                          <Badge variant="default" className="text-xs shrink-0"><Star className="h-3 w-3 mr-1" />VIP</Badge>
                        )}
                        {guest.blacklistStatus && (
                          <Badge variant="destructive" className="text-xs shrink-0"><ShieldOff className="h-3 w-3" /></Badge>
                        )}
                      </div>
                      {guest.email && <p className="text-xs text-muted-foreground truncate">{guest.email}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {guest.loyaltyTier && guest.loyaltyTier !== "none" && (
                          <Badge className={`text-xs ${getLoyaltyBadgeColor(guest.loyaltyTier)}`}>
                            {guest.loyaltyTier}
                          </Badge>
                        )}
                        {guest.segment && (
                          <Badge variant="outline" className="text-xs">{guest.segment}</Badge>
                        )}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditDialog(guest); }} data-testid={`button-edit-guest-${guest.id}`}>
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
          {!selectedGuest ? (
            <Card className="h-[calc(100vh-400px)] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a guest to view their profile</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[calc(100vh-400px)] flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle>
                          {selectedGuest.firstName} {selectedGuest.lastName}
                        </CardTitle>
                        {selectedGuest.vipStatus && <Badge><Star className="h-3 w-3 mr-1" />VIP</Badge>}
                        {selectedGuest.blacklistStatus && <Badge variant="destructive"><ShieldOff className="h-3 w-3 mr-1" />Blacklisted</Badge>}
                        {selectedGuest.loyaltyTier && selectedGuest.loyaltyTier !== "none" && (
                          <Badge className={getLoyaltyBadgeColor(selectedGuest.loyaltyTier)}>
                            <Award className="h-3 w-3 mr-1" />{selectedGuest.loyaltyTier} ({selectedGuest.loyaltyPoints || 0} pts)
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Guest since {format(new Date(selectedGuest.createdAt), "MMM yyyy")} • {selectedGuest.segment || "leisure"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setShowCommunicationDialog(true)} data-testid="button-add-communication">
                      <MessageSquare className="h-4 w-4 mr-1" />Log
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportGuestMutation.mutate(selectedGuest.id)} data-testid="button-export-guest">
                      <Download className="h-4 w-4 mr-1" />Export
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowMergeDialog(true)} data-testid="button-merge-guest">
                      <GitMerge className="h-4 w-4 mr-1" />Merge
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" data-testid="button-delete-guest">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Guest Data?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will anonymize all personal data for GDPR compliance. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteGuestMutation.mutate(selectedGuest.id)} data-testid="button-confirm-delete">
                            Delete Data
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <Tabs defaultValue="profile" className="h-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
                    <TabsTrigger value="loyalty" data-testid="tab-loyalty">Loyalty</TabsTrigger>
                    <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
                    <TabsTrigger value="communications" data-testid="tab-communications">Comms</TabsTrigger>
                    <TabsTrigger value="preferences" data-testid="tab-preferences">Preferences</TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Contact Information</h4>
                        <div className="space-y-2">
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
                                  <div>{selectedGuest.city}{selectedGuest.state && `, ${selectedGuest.state}`}{selectedGuest.country && `, ${selectedGuest.country}`}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <h4 className="font-medium mt-6">Guest Statistics</h4>
                        {profileLoading ? (
                          <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : (guestProfile as any)?.profile && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Total Stays:</span>
                              <span className="font-medium" data-testid="text-total-stays">{(guestProfile as any).profile.totalStays}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Total Revenue:</span>
                              <span className="font-medium" data-testid="text-total-revenue">${(guestProfile as any).profile.totalRevenue.toFixed(2)}</span>
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

                      <div className="space-y-4">
                        <h4 className="font-medium">Guest Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {(selectedGuest.tags as string[])?.map(tag => (
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />{tag}
                              <button onClick={() => removeTag(tag)} className="ml-1 text-muted-foreground hover:text-foreground">×</button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input placeholder="Add tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)} className="flex-1" data-testid="input-new-tag" />
                          <Button size="sm" onClick={addTag} data-testid="button-add-tag">Add</Button>
                        </div>

                        <h4 className="font-medium mt-6">Blacklist Status</h4>
                        <div className="flex items-center justify-between border rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            {selectedGuest.blacklistStatus ? <ShieldOff className="h-4 w-4 text-destructive" /> : <Shield className="h-4 w-4 text-green-500" />}
                            <span className="text-sm">{selectedGuest.blacklistStatus ? "Blacklisted" : "In Good Standing"}</span>
                          </div>
                          <Switch
                            checked={selectedGuest.blacklistStatus || false}
                            onCheckedChange={(checked) => updateBlacklistMutation.mutate({ id: selectedGuest.id, blacklistStatus: checked })}
                            data-testid="switch-blacklist"
                          />
                        </div>
                        {selectedGuest.blacklistReason && (
                          <p className="text-sm text-muted-foreground bg-destructive/10 p-2 rounded">{selectedGuest.blacklistReason}</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="loyalty" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Loyalty Tier</h4>
                        <Select 
                          value={selectedGuest.loyaltyTier || "none"} 
                          onValueChange={(tier) => updateLoyaltyMutation.mutate({ id: selectedGuest.id, loyaltyTier: tier, loyaltyPoints: selectedGuest.loyaltyPoints || 0 })}
                        >
                          <SelectTrigger data-testid="select-loyalty-tier">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {loyaltyTiers.map(tier => (
                              <SelectItem key={tier} value={tier}>
                                <div className="flex items-center gap-2">
                                  <Badge className={getLoyaltyBadgeColor(tier)}>{tier}</Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <h4 className="font-medium">Loyalty Points</h4>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={selectedGuest.loyaltyPoints || 0}
                            onChange={(e) => updateLoyaltyMutation.mutate({ id: selectedGuest.id, loyaltyTier: selectedGuest.loyaltyTier || "none", loyaltyPoints: parseInt(e.target.value) || 0 })}
                            className="w-32"
                            data-testid="input-loyalty-points"
                          />
                          <span className="text-sm text-muted-foreground">points</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium">Guest Segment</h4>
                        <Select 
                          value={selectedGuest.segment || "leisure"} 
                          onValueChange={(seg) => updateSegmentMutation.mutate({ id: selectedGuest.id, segment: seg })}
                        >
                          <SelectTrigger data-testid="select-segment">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {segments.map(seg => (
                              <SelectItem key={seg} value={seg}>{seg.charAt(0).toUpperCase() + seg.slice(1).replace('_', ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="bg-muted p-4 rounded-lg mt-6">
                          <h5 className="font-medium mb-2">Tier Benefits</h5>
                          <div className="text-sm space-y-1 text-muted-foreground">
                            {selectedGuest.loyaltyTier === "platinum" && <p>- Priority booking and upgrades</p>}
                            {selectedGuest.loyaltyTier === "platinum" && <p>- 25% off all services</p>}
                            {(selectedGuest.loyaltyTier === "platinum" || selectedGuest.loyaltyTier === "gold") && <p>- Late checkout included</p>}
                            {(selectedGuest.loyaltyTier === "platinum" || selectedGuest.loyaltyTier === "gold") && <p>- Welcome amenity</p>}
                            {(selectedGuest.loyaltyTier === "silver" || selectedGuest.loyaltyTier === "gold" || selectedGuest.loyaltyTier === "platinum") && <p>- Early check-in when available</p>}
                            {selectedGuest.loyaltyTier === "bronze" && <p>- Basic member benefits</p>}
                            {selectedGuest.loyaltyTier === "none" && <p>- No loyalty benefits (enroll guest to unlock)</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4 mt-4">
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
                          <div key={stay.id} className="border rounded-lg p-3" data-testid={`card-stay-${stay.id}`}>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
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

                  <TabsContent value="communications" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        <h4 className="font-medium">Communication Log</h4>
                      </div>
                      <Button size="sm" onClick={() => setShowCommunicationDialog(true)} data-testid="button-new-communication">
                        <Plus className="h-4 w-4 mr-1" />New Entry
                      </Button>
                    </div>
                    {(communicationsData as any)?.communications?.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No communications logged</div>
                    ) : (
                      <div className="space-y-3">
                        {(communicationsData as any)?.communications?.map((comm: GuestCommunication) => (
                          <div key={comm.id} className="border rounded-lg p-3" data-testid={`card-communication-${comm.id}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={comm.direction === "inbound" ? "default" : "outline"}>
                                  {comm.direction}
                                </Badge>
                                <Badge variant="secondary">{comm.type}</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comm.createdAt), "MMM dd, yyyy HH:mm")}
                              </span>
                            </div>
                            {comm.subject && <p className="font-medium text-sm">{comm.subject}</p>}
                            <p className="text-sm text-muted-foreground">{comm.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="preferences" className="space-y-4 mt-4">
                    <h4 className="font-medium">Guest Preferences</h4>
                    {selectedGuest.preferences && Object.keys(selectedGuest.preferences).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(selectedGuest.preferences).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm border-b pb-2">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="font-medium">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No preferences set</p>
                    )}
                    
                    {selectedGuest.notes && (
                      <div className="space-y-2 mt-6">
                        <h5 className="font-medium text-sm">Notes</h5>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{selectedGuest.notes}</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Guest Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Guest Profile</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateGuest)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-first-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-last-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} value={field.value || ''} data-testid="input-edit-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} data-testid="input-edit-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="vipStatus" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>VIP Status</FormLabel>
                    <div className="text-sm text-muted-foreground">Mark as VIP guest</div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-edit-vip-status" />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ''} rows={3} data-testid="textarea-edit-notes" /></FormControl>
                </FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} data-testid="button-edit-cancel">Cancel</Button>
                <Button type="submit" disabled={updateGuestMutation.isPending} data-testid="button-save-edit-guest">
                  {updateGuestMutation.isPending ? "Updating..." : "Update Guest"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Communication Dialog */}
      <Dialog open={showCommunicationDialog} onOpenChange={setShowCommunicationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Communication</DialogTitle>
            <DialogDescription>Record a communication with {selectedGuest?.firstName} {selectedGuest?.lastName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={communicationForm.type} onValueChange={(v) => setCommunicationForm({...communicationForm, type: v})}>
                  <SelectTrigger data-testid="select-comm-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Direction</label>
                <Select value={communicationForm.direction} onValueChange={(v) => setCommunicationForm({...communicationForm, direction: v})}>
                  <SelectTrigger data-testid="select-comm-direction"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input 
                value={communicationForm.subject} 
                onChange={(e) => setCommunicationForm({...communicationForm, subject: e.target.value})} 
                placeholder="Communication subject..."
                data-testid="input-comm-subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content *</label>
              <Textarea 
                value={communicationForm.content} 
                onChange={(e) => setCommunicationForm({...communicationForm, content: e.target.value})} 
                placeholder="Communication details..."
                rows={4}
                data-testid="textarea-comm-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommunicationDialog(false)} data-testid="button-cancel-comm">Cancel</Button>
            <Button 
              onClick={() => selectedGuest && addCommunicationMutation.mutate({ guestId: selectedGuest.id, data: communicationForm })}
              disabled={!communicationForm.content || addCommunicationMutation.isPending}
              data-testid="button-save-comm"
            >
              {addCommunicationMutation.isPending ? "Saving..." : "Log Communication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Guest Profiles</DialogTitle>
            <DialogDescription>
              Merge {selectedGuest?.firstName} {selectedGuest?.lastName} with another guest profile. 
              All reservations, communications, and loyalty points will be transferred.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select guest to merge into {selectedGuest?.firstName}</label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger data-testid="select-merge-target"><SelectValue placeholder="Select duplicate guest..." /></SelectTrigger>
                <SelectContent>
                  {(allGuestsData as any)?.guests?.filter((g: Guest) => g.id !== selectedGuest?.id).map((g: Guest) => (
                    <SelectItem key={g.id} value={g.id}>{g.firstName} {g.lastName} ({g.email || 'No email'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium">What happens when you merge:</p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Loyalty points will be combined</li>
                <li>All tags will be merged</li>
                <li>Reservations will be transferred to {selectedGuest?.firstName}</li>
                <li>The duplicate guest will be anonymized</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)} data-testid="button-cancel-merge">Cancel</Button>
            <Button 
              onClick={() => selectedGuest && mergeTargetId && mergeGuestsMutation.mutate({ primaryGuestId: selectedGuest.id, duplicateGuestId: mergeTargetId })}
              disabled={!mergeTargetId || mergeGuestsMutation.isPending}
              data-testid="button-confirm-merge"
            >
              {mergeGuestsMutation.isPending ? "Merging..." : "Merge Guests"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
