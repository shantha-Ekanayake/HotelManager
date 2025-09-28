import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChargeSchema, insertPaymentSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  DollarSign, 
  Plus, 
  CreditCard, 
  FileText, 
  Receipt, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  User
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Folio {
  id: string;
  reservationId: string;
  guestId: string;
  propertyId: string;
  folioNumber: string;
  status: 'open' | 'closed' | 'transferred';
  totalCharges: string;
  totalPayments: string;
  balance: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Charge {
  id: string;
  folioId: string;
  chargeCode: string;
  description: string;
  amount: string;
  taxAmount: string;
  totalAmount: string;
  chargeDate: string;
  postingDate: string;
  postedBy: string;
  isVoided: boolean;
  voidReason?: string;
}

interface Payment {
  id: string;
  folioId: string;
  amount: string;
  paymentMethod: string;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate: string;
  postedBy: string;
  notes?: string;
}

interface BillingSummary {
  totalRevenue: number;
  totalOutstanding: number;
  totalRefunds: number;
  totalCharges: number;
  totalPayments: number;
  openFolios: number;
}

const chargeFormSchema = insertChargeSchema.omit({
  folioId: true,
}).extend({
  amount: z.string().transform(val => val),
  taxAmount: z.string().transform(val => val),
  totalAmount: z.string().transform(val => val),
});

const paymentFormSchema = insertPaymentSchema.omit({
  folioId: true,
  status: true,
}).extend({
  amount: z.string().transform(val => val),
});

export default function Billing() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolio, setSelectedFolio] = useState<Folio | null>(null);
  const [showChargeDialog, setShowChargeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Get billing summary (using authenticated user's property)
  const { data: billingSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/billing", "summary"],
    queryFn: async () => {
      // Get user's property from their profile (secure approach)
      const userResponse = await apiRequest("GET", "/api/auth/me");
      const userData = await userResponse.json();
      const propertyId = userData?.user?.propertyId;
      if (!propertyId) throw new Error("User property not found");
      const summaryResponse = await apiRequest("GET", `/api/properties/${propertyId}/billing/summary`);
      return summaryResponse.json();
    },
  });

  // Search folios via guest search (since folios are tied to guests)
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/guests/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return null;
      const guestResponse = await apiRequest("GET", `/api/guests/search?query=${encodeURIComponent(searchQuery)}`);
      const guestResults = await guestResponse.json();
      // Get folios for found guests
      const folios = [];
      for (const guest of guestResults?.guests || []) {
        const folioResponse = await apiRequest("GET", `/api/guests/${guest.id}/folios`);
        const folioData = await folioResponse.json();
        folios.push(...(folioData?.folios || []));
      }
      return { folios };
    },
    enabled: !!searchQuery,
  });

  // Get folio charges
  const { data: folioCharges, isLoading: chargesLoading } = useQuery({
    queryKey: ["/api/folios", selectedFolio?.id, "charges"],
    queryFn: async () => {
      if (!selectedFolio) return null;
      const response = await apiRequest("GET", `/api/folios/${selectedFolio.id}/charges`);
      return response.json();
    },
    enabled: !!selectedFolio,
  });

  // Get folio payments
  const { data: folioPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/folios", selectedFolio?.id, "payments"],
    queryFn: async () => {
      if (!selectedFolio) return null;
      const response = await apiRequest("GET", `/api/folios/${selectedFolio.id}/payments`);
      return response.json();
    },
    enabled: !!selectedFolio,
  });

  // Forms
  const chargeForm = useForm<z.infer<typeof chargeFormSchema>>({
    resolver: zodResolver(chargeFormSchema),
    defaultValues: {
      chargeCode: "",
      description: "",
      amount: "0",
      taxAmount: "0",
      totalAmount: "0",
    },
  });

  const paymentForm = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: "0",
      paymentMethod: "",
      notes: "",
    },
  });

  // Create charge mutation
  const createChargeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof chargeFormSchema>) => {
      const response = await apiRequest("POST", "/api/charges", {
        folioId: selectedFolio?.id,
        chargeCode: data.chargeCode,
        description: data.description,
        amount: data.amount,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Charge posted successfully" });
      setShowChargeDialog(false);
      chargeForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id, "charges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/search"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error posting charge", 
        description: error.message || "Failed to post charge",
        variant: "destructive" 
      });
    },
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof paymentFormSchema>) => {
      const response = await apiRequest("POST", "/api/payments", {
        folioId: selectedFolio?.id,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Payment processed successfully" });
      setShowPaymentDialog(false);
      paymentForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/search"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error processing payment", 
        description: error.message || "Failed to process payment",
        variant: "destructive" 
      });
    },
  });

  const handleCreateCharge = (data: z.infer<typeof chargeFormSchema>) => {
    createChargeMutation.mutate(data);
  };

  const handleCreatePayment = (data: z.infer<typeof paymentFormSchema>) => {
    createPaymentMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case 'closed':
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Closed</Badge>;
      case 'transferred':
        return <Badge variant="outline"><TrendingUp className="h-3 w-3 mr-1" />Transferred</Badge>;
      default:
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'refunded':
        return <Badge variant="secondary"><TrendingUp className="h-3 w-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-billing">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Billing & Folios</h1>
          <p className="text-muted-foreground">Manage guest billing, charges, and payments</p>
        </div>
      </div>

      {/* Billing Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ${summaryLoading ? "..." : (billingSummary as any)?.summary?.totalRevenue?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">All completed transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-outstanding-balance">
              ${summaryLoading ? "..." : (billingSummary as any)?.summary?.totalOutstanding?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Unpaid amounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Folios</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-open-folios">
              {summaryLoading ? "..." : (billingSummary as any)?.summary?.openFolios || "0"}
            </div>
            <p className="text-xs text-muted-foreground">Active billing accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Charges</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-charges">
              ${summaryLoading ? "..." : (billingSummary as any)?.summary?.totalCharges?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Posted today</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search folios by number, guest name, or reservation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-folios"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Folio List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Guest Folios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {searchLoading && (
                <div className="text-center py-4 text-muted-foreground">Searching...</div>
              )}
              {searchQuery && !searchLoading && (searchResults as any)?.folios?.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">No folios found</div>
              )}
              {!searchQuery && (
                <div className="text-center py-4 text-muted-foreground">
                  Enter a search term to find folios
                </div>
              )}
              {(searchResults as any)?.folios?.map((folio: Folio) => (
                <div
                  key={folio.id}
                  className={`p-3 rounded-lg border cursor-pointer hover-elevate transition-colors ${
                    selectedFolio?.id === folio.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedFolio(folio)}
                  data-testid={`card-folio-${folio.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{folio.folioNumber}</h4>
                    {getStatusBadge(folio.status)}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Charges:</span>
                      <span className="font-medium">${parseFloat(folio.totalCharges).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payments:</span>
                      <span className="font-medium">${parseFloat(folio.totalPayments).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Balance:</span>
                      <span className={`font-medium ${parseFloat(folio.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${parseFloat(folio.balance).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Folio Details */}
        <div className="lg:col-span-2">
          {!selectedFolio && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a folio to view billing details</p>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedFolio && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedFolio.folioNumber}
                        {getStatusBadge(selectedFolio.status)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(selectedFolio.createdAt), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={showChargeDialog} onOpenChange={setShowChargeDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-charge">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Charge
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                    <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" data-testid="button-add-payment">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Record Payment
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="charges" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="charges" data-testid="tab-charges">Charges</TabsTrigger>
                    <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="charges" className="space-y-4">
                    {chargesLoading ? (
                      <div className="text-center py-4 text-muted-foreground">Loading charges...</div>
                    ) : (folioCharges as any)?.charges?.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No charges posted</div>
                    ) : (
                      <div className="space-y-3">
                        {(folioCharges as any)?.charges?.map((charge: Charge) => (
                          <div 
                            key={charge.id} 
                            className="border rounded-lg p-3"
                            data-testid={`card-charge-${charge.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{charge.description}</span>
                                <Badge variant="outline">{charge.chargeCode}</Badge>
                                {charge.isVoided && (
                                  <Badge variant="destructive">Voided</Badge>
                                )}
                              </div>
                              <span className="font-medium text-lg">
                                ${parseFloat(charge.totalAmount).toFixed(2)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Amount: ${parseFloat(charge.amount).toFixed(2)}</span>
                                <span>Tax: ${parseFloat(charge.taxAmount).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span>Posted: {format(new Date(charge.postingDate), "MMM dd, yyyy")}</span>
                                <span>Charge Date: {format(new Date(charge.chargeDate), "MMM dd, yyyy")}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="payments" className="space-y-4">
                    {paymentsLoading ? (
                      <div className="text-center py-4 text-muted-foreground">Loading payments...</div>
                    ) : (folioPayments as any)?.payments?.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No payments recorded</div>
                    ) : (
                      <div className="space-y-3">
                        {(folioPayments as any)?.payments?.map((payment: Payment) => (
                          <div 
                            key={payment.id} 
                            className="border rounded-lg p-3"
                            data-testid={`card-payment-${payment.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{payment.paymentMethod}</span>
                                {getPaymentStatusBadge(payment.status)}
                              </div>
                              <span className="font-medium text-lg">
                                ${parseFloat(payment.amount).toFixed(2)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Transaction ID: {payment.transactionId || 'N/A'}</span>
                                <span>Date: {format(new Date(payment.paymentDate), "MMM dd, yyyy")}</span>
                              </div>
                              {payment.notes && (
                                <div className="mt-1">Notes: {payment.notes}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Charge Dialog */}
      <Dialog open={showChargeDialog} onOpenChange={setShowChargeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Charge to Folio</DialogTitle>
          </DialogHeader>
          <Form {...chargeForm}>
            <form onSubmit={chargeForm.handleSubmit(handleCreateCharge)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={chargeForm.control}
                  name="chargeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Charge Code</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-charge-code">
                            <SelectValue placeholder="Select charge type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ROOM">Room Charge</SelectItem>
                            <SelectItem value="TAX">Tax</SelectItem>
                            <SelectItem value="MISC">Miscellaneous</SelectItem>
                            <SelectItem value="FOOD">Food & Beverage</SelectItem>
                            <SelectItem value="PHONE">Phone</SelectItem>
                            <SelectItem value="INTERNET">Internet</SelectItem>
                            <SelectItem value="PARKING">Parking</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={chargeForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-charge-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={chargeForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          data-testid="input-charge-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={chargeForm.control}
                  name="taxAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          data-testid="input-tax-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={chargeForm.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          data-testid="input-total-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowChargeDialog(false)}
                  data-testid="button-cancel-charge"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createChargeMutation.isPending}
                  data-testid="button-save-charge"
                >
                  {createChargeMutation.isPending ? "Posting..." : "Post Charge"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handleCreatePayment)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          data-testid="input-payment-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="debit_card">Debit Card</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} rows={3} data-testid="textarea-payment-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPaymentDialog(false)}
                  data-testid="button-cancel-payment"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPaymentMutation.isPending}
                  data-testid="button-save-payment"
                >
                  {createPaymentMutation.isPending ? "Processing..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}