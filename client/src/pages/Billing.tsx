import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Printer,
  Ban,
  RefreshCcw,
  Lock,
  Pencil,
  Save,
  X,
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
  notes?: string | null;
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
  voidReason?: string | null;
}

interface Payment {
  id: string;
  folioId: string;
  amount: string;
  paymentMethod: string;
  transactionId?: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate: string;
  postedBy: string;
  notes?: string | null;
  refundAmount?: string | null;
  refundReason?: string | null;
  refundedAt?: string | null;
}

const chargeFormSchema = z.object({
  chargeCode: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  amount: z.string().min(1, "Required"),
  taxRate: z.string(),
  discount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
});

const paymentFormSchema = z.object({
  amount: z.string().min(1, "Required"),
  paymentMethod: z.string().min(1, "Required"),
  notes: z.string().optional(),
});

const voidFormSchema = z.object({
  voidReason: z.string().min(3, "Please provide a reason"),
});

const refundFormSchema = z.object({
  refundAmount: z.string().min(1, "Required"),
  refundReason: z.string().min(3, "Please provide a reason"),
});

export default function Billing() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolio, setSelectedFolio] = useState<Folio | null>(null);
  const [showChargeDialog, setShowChargeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [chargeToVoid, setChargeToVoid] = useState<Charge | null>(null);
  const [paymentToRefund, setPaymentToRefund] = useState<Payment | null>(null);
  const [showCloseFolioDialog, setShowCloseFolioDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const [targetCurrency, setTargetCurrency] = useState(() => {
    return localStorage.getItem("preferred_currency") || "LKR";
  });

  const exchangeRates: Record<string, number> = {
    LKR: 1,
    USD: 0.0033,
    EUR: 0.0031,
    GBP: 0.0026,
  };

  const convertAmount = (amount: number | string) => {
    const raw = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(raw)) return 0;
    return raw * (exchangeRates[targetCurrency] || 1);
  };

  const formatWithCurrency = (amount: number | string) => {
    const raw = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(raw)) return targetCurrency === "LKR" ? "Rs. 0.00" : "$0.00";
    const converted = convertAmount(raw);
    if (targetCurrency === "LKR") {
      return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        currencyDisplay: "symbol",
      })
        .format(raw)
        .replace("LKR", "Rs.");
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: targetCurrency,
    }).format(converted);
  };

  const handleCurrencyChange = (value: string) => {
    setTargetCurrency(value);
    localStorage.setItem("preferred_currency", value);
  };

  // Get billing summary
  const { data: billingSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/billing", "summary"],
    queryFn: async () => {
      const userResponse = await apiRequest("GET", "/api/auth/me");
      const userData = await userResponse.json();
      const propertyId = userData?.user?.propertyId;
      if (!propertyId) throw new Error("User property not found");
      const summaryResponse = await apiRequest(
        "GET",
        `/api/properties/${propertyId}/billing/summary`,
      );
      return summaryResponse.json();
    },
  });

  // Search folios via guest search
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/guests/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return null;
      const guestResponse = await apiRequest(
        "GET",
        `/api/guests/search?query=${encodeURIComponent(searchQuery)}`,
      );
      const guestResults = await guestResponse.json();
      const folios = [];
      const guestMap: Record<string, any> = {};
      for (const guest of guestResults?.guests || []) {
        guestMap[guest.id] = guest;
        const folioResponse = await apiRequest("GET", `/api/guests/${guest.id}/folios`);
        const folioData = await folioResponse.json();
        for (const f of folioData?.folios || []) {
          folios.push({ ...f, guest });
        }
      }
      return { folios, guestMap };
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

  // Refresh selected folio when changes happen so balance/totals stay current
  const { data: selectedFolioFresh } = useQuery({
    queryKey: ["/api/folios", selectedFolio?.id],
    queryFn: async () => {
      if (!selectedFolio) return null;
      const response = await apiRequest("GET", `/api/folios/${selectedFolio.id}`);
      const data = await response.json();
      return data?.folio as Folio | null;
    },
    enabled: !!selectedFolio,
  });

  // Keep local selectedFolio in sync with refreshed folio data
  useEffect(() => {
    if (selectedFolioFresh && selectedFolio && selectedFolioFresh.id === selectedFolio.id) {
      const fresh = selectedFolioFresh;
      const stale = selectedFolio;
      if (
        fresh.balance !== stale.balance ||
        fresh.totalCharges !== stale.totalCharges ||
        fresh.totalPayments !== stale.totalPayments ||
        fresh.status !== stale.status ||
        (fresh.notes ?? null) !== (stale.notes ?? null)
      ) {
        setSelectedFolio(fresh);
      }
    }
  }, [selectedFolioFresh]);

  // Forms
  const chargeForm = useForm<z.infer<typeof chargeFormSchema>>({
    resolver: zodResolver(chargeFormSchema),
    defaultValues: {
      chargeCode: "",
      description: "",
      amount: "0",
      taxRate: "10",
      discount: "0",
      taxAmount: "0",
      totalAmount: "0",
    },
  });

  // Auto-calculate tax/total when amount, taxRate, or discount changes
  const watchAmount = chargeForm.watch("amount");
  const watchTaxRate = chargeForm.watch("taxRate");
  const watchDiscount = chargeForm.watch("discount");

  useEffect(() => {
    const amt = parseFloat(watchAmount || "0") || 0;
    const rate = parseFloat(watchTaxRate || "0") || 0;
    const disc = parseFloat(watchDiscount || "0") || 0;
    const netAmount = Math.max(0, amt - disc);
    const tax = +(netAmount * (rate / 100)).toFixed(2);
    const total = +(netAmount + tax).toFixed(2);
    chargeForm.setValue("taxAmount", tax.toFixed(2));
    chargeForm.setValue("totalAmount", total.toFixed(2));
  }, [watchAmount, watchTaxRate, watchDiscount]);

  const paymentForm = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: "0",
      paymentMethod: "",
      notes: "",
    },
  });

  const voidForm = useForm<z.infer<typeof voidFormSchema>>({
    resolver: zodResolver(voidFormSchema),
    defaultValues: { voidReason: "" },
  });

  const refundForm = useForm<z.infer<typeof refundFormSchema>>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: { refundAmount: "0", refundReason: "" },
  });

  // Mutations
  const createChargeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof chargeFormSchema>) => {
      const amt = parseFloat(data.amount || "0") || 0;
      const disc = parseFloat(data.discount || "0") || 0;
      const netAmount = Math.max(0, amt - disc);
      const description = disc > 0
        ? `${data.description} (discount ${formatWithCurrency(disc)})`
        : data.description;
      await apiRequest("POST", "/api/charges", {
        folioId: selectedFolio?.id,
        chargeCode: data.chargeCode,
        description,
        amount: netAmount.toFixed(2),
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
      });
    },
    onSuccess: () => {
      toast({ title: "Charge posted successfully" });
      setShowChargeDialog(false);
      chargeForm.reset({
        chargeCode: "",
        description: "",
        amount: "0",
        taxRate: "10",
        discount: "0",
        taxAmount: "0",
        totalAmount: "0",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id, "charges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/search"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error posting charge",
        description: error.message || "Failed to post charge",
        variant: "destructive",
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof paymentFormSchema>) => {
      await apiRequest("POST", "/api/payments", {
        folioId: selectedFolio?.id,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      toast({ title: "Payment recorded successfully" });
      setShowPaymentDialog(false);
      paymentForm.reset({ amount: "0", paymentMethod: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/search"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error recording payment",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const voidChargeMutation = useMutation({
    mutationFn: async ({ id, voidReason }: { id: string; voidReason: string }) => {
      await apiRequest("POST", `/api/charges/${id}/void`, { voidReason });
    },
    onSuccess: () => {
      toast({ title: "Charge voided" });
      setChargeToVoid(null);
      voidForm.reset({ voidReason: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id, "charges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/search"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error voiding charge",
        description: error.message || "Failed to void charge",
        variant: "destructive",
      });
    },
  });

  const completePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/payments/${id}`, { status: "completed" });
    },
    onSuccess: () => {
      toast({ title: "Payment marked as completed" });
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/search"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating payment",
        description: error.message || "Failed to mark as completed",
        variant: "destructive",
      });
    },
  });

  const refundPaymentMutation = useMutation({
    mutationFn: async ({
      id,
      refundAmount,
      refundReason,
    }: {
      id: string;
      refundAmount: string;
      refundReason: string;
    }) => {
      await apiRequest("PUT", `/api/payments/${id}`, {
        status: "refunded",
        refundAmount,
        refundReason,
      });
    },
    onSuccess: () => {
      toast({ title: "Payment refunded" });
      setPaymentToRefund(null);
      refundForm.reset({ refundAmount: "0", refundReason: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/search"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error refunding payment",
        description: error.message || "Failed to refund payment",
        variant: "destructive",
      });
    },
  });

  const closeFolioMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/folios/${id}`, { status: "closed" });
    },
    onSuccess: () => {
      toast({ title: "Folio closed" });
      setShowCloseFolioDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/search"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error closing folio",
        description: error.message || "Failed to close folio",
        variant: "destructive",
      });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await apiRequest("PUT", `/api/folios/${id}`, { notes });
    },
    onSuccess: () => {
      toast({ title: "Notes updated" });
      setEditingNotes(false);
      queryClient.invalidateQueries({ queryKey: ["/api/folios", selectedFolio?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/search"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating notes",
        description: error.message || "Failed to update notes",
        variant: "destructive",
      });
    },
  });

  // Pre-fill payment amount with outstanding balance when dialog opens
  useEffect(() => {
    if (showPaymentDialog && selectedFolio) {
      const bal = parseFloat(selectedFolio.balance) || 0;
      paymentForm.reset({
        amount: bal > 0 ? bal.toFixed(2) : "0",
        paymentMethod: "",
        notes: "",
      });
    }
  }, [showPaymentDialog, selectedFolio?.id]);

  // Pre-fill refund amount with payment amount
  useEffect(() => {
    if (paymentToRefund) {
      refundForm.reset({
        refundAmount: paymentToRefund.amount,
        refundReason: "",
      });
    }
  }, [paymentToRefund]);

  // Pre-fill notes draft when starting to edit
  useEffect(() => {
    if (editingNotes && selectedFolio) {
      setNotesDraft(selectedFolio.notes || "");
    }
  }, [editingNotes, selectedFolio?.id]);

  const handleCreateCharge = (data: z.infer<typeof chargeFormSchema>) => {
    createChargeMutation.mutate(data);
  };

  const handleCreatePayment = (data: z.infer<typeof paymentFormSchema>) => {
    createPaymentMutation.mutate(data);
  };

  const handleVoidCharge = (data: z.infer<typeof voidFormSchema>) => {
    if (!chargeToVoid) return;
    voidChargeMutation.mutate({ id: chargeToVoid.id, voidReason: data.voidReason });
  };

  const handleRefundPayment = (data: z.infer<typeof refundFormSchema>) => {
    if (!paymentToRefund) return;
    refundPaymentMutation.mutate({
      id: paymentToRefund.id,
      refundAmount: data.refundAmount,
      refundReason: data.refundReason,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="default">
            <Clock className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case "closed":
        return (
          <Badge variant="secondary">
            <CheckCircle className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        );
      case "transferred":
        return (
          <Badge variant="outline">
            <TrendingUp className="h-3 w-3 mr-1" />
            Transferred
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "refunded":
        return (
          <Badge variant="secondary">
            <RefreshCcw className="h-3 w-3 mr-1" />
            Refunded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Print invoice (full folio)
  const handlePrintInvoice = () => {
    if (!selectedFolio) return;
    const charges: Charge[] = (folioCharges as any)?.charges || [];
    const payments: Payment[] = (folioPayments as any)?.payments || [];
    const guest = (searchResults as any)?.folios?.find((f: any) => f.id === selectedFolio.id)?.guest;

    const escapeHtml = (s: string) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Invoice ${escapeHtml(selectedFolio.folioNumber)}</title>
<style>
  body { font-family: Inter, Arial, sans-serif; color: #111; padding: 32px; max-width: 800px; margin: auto; }
  h1 { font-size: 22px; margin: 0 0 4px 0; }
  h2 { font-size: 14px; margin: 24px 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .meta { display: flex; justify-content: space-between; margin-top: 12px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f5f5f5; font-weight: 600; }
  .right { text-align: right; }
  .totals { margin-top: 16px; width: 320px; margin-left: auto; font-size: 13px; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .row.bold { font-weight: 700; border-top: 1px solid #333; margin-top: 6px; padding-top: 8px; font-size: 15px; }
  .voided { text-decoration: line-through; color: #999; }
  .footer { margin-top: 32px; font-size: 11px; color: #888; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>Invoice</h1>
  <div>Folio ${escapeHtml(selectedFolio.folioNumber)} &mdash; Status: ${escapeHtml(selectedFolio.status)}</div>
  <div class="meta">
    <div>
      <strong>Guest:</strong> ${guest ? escapeHtml(`${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim()) : "—"}<br />
      ${guest?.email ? `<span>${escapeHtml(guest.email)}</span><br />` : ""}
      ${guest?.phone ? `<span>${escapeHtml(guest.phone)}</span>` : ""}
    </div>
    <div class="right">
      <strong>Issued:</strong> ${format(new Date(), "MMM dd, yyyy HH:mm")}<br />
      <strong>Folio created:</strong> ${format(new Date(selectedFolio.createdAt), "MMM dd, yyyy")}
    </div>
  </div>

  <h2>Charges</h2>
  ${
    charges.length === 0
      ? "<div>No charges posted.</div>"
      : `<table>
    <thead><tr><th>Date</th><th>Code</th><th>Description</th><th class="right">Amount</th><th class="right">Tax</th><th class="right">Total</th></tr></thead>
    <tbody>
      ${charges
        .map(
          (c) =>
            `<tr class="${c.isVoided ? "voided" : ""}">
          <td>${format(new Date(c.postingDate), "MMM dd, yyyy")}</td>
          <td>${escapeHtml(c.chargeCode)}</td>
          <td>${escapeHtml(c.description)}${c.isVoided ? " (VOIDED)" : ""}</td>
          <td class="right">${formatWithCurrency(c.amount)}</td>
          <td class="right">${formatWithCurrency(c.taxAmount)}</td>
          <td class="right">${formatWithCurrency(c.totalAmount)}</td>
        </tr>`,
        )
        .join("")}
    </tbody>
  </table>`
  }

  <h2>Payments</h2>
  ${
    payments.length === 0
      ? "<div>No payments recorded.</div>"
      : `<table>
    <thead><tr><th>Date</th><th>Method</th><th>Status</th><th>Notes</th><th class="right">Amount</th></tr></thead>
    <tbody>
      ${payments
        .map(
          (p) =>
            `<tr>
          <td>${format(new Date(p.paymentDate), "MMM dd, yyyy")}</td>
          <td>${escapeHtml(p.paymentMethod)}</td>
          <td>${escapeHtml(p.status)}</td>
          <td>${escapeHtml(p.notes || "")}</td>
          <td class="right">${formatWithCurrency(p.amount)}</td>
        </tr>`,
        )
        .join("")}
    </tbody>
  </table>`
  }

  <div class="totals">
    <div class="row"><span>Total Charges</span><span>${formatWithCurrency(selectedFolio.totalCharges)}</span></div>
    <div class="row"><span>Total Payments</span><span>${formatWithCurrency(selectedFolio.totalPayments)}</span></div>
    <div class="row bold"><span>Balance Due</span><span>${formatWithCurrency(selectedFolio.balance)}</span></div>
  </div>

  ${selectedFolio.notes ? `<h2>Notes</h2><div>${escapeHtml(selectedFolio.notes)}</div>` : ""}

  <div class="footer">Thank you for your stay.</div>

  <script>
    window.onload = function() { setTimeout(function(){ window.print(); }, 250); };
  </script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      toast({
        title: "Pop-up blocked",
        description: "Allow pop-ups to print the invoice.",
        variant: "destructive",
      });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const handlePrintReceipt = (payment: Payment) => {
    if (!selectedFolio) return;
    const escapeHtml = (s: string) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Receipt ${escapeHtml(payment.id)}</title>
<style>
  body { font-family: Inter, Arial, sans-serif; color: #111; padding: 24px; max-width: 360px; margin: auto; }
  h1 { font-size: 18px; text-align: center; margin: 0 0 4px 0; }
  .center { text-align: center; }
  hr { border: none; border-top: 1px dashed #999; margin: 12px 0; }
  .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
  .total { font-size: 16px; font-weight: 700; }
  @media print { body { padding: 8px; } }
</style>
</head>
<body>
  <h1>Payment Receipt</h1>
  <div class="center">Folio ${escapeHtml(selectedFolio.folioNumber)}</div>
  <hr />
  <div class="row"><span>Date</span><span>${format(new Date(payment.paymentDate), "MMM dd, yyyy HH:mm")}</span></div>
  <div class="row"><span>Method</span><span>${escapeHtml(payment.paymentMethod)}</span></div>
  <div class="row"><span>Status</span><span>${escapeHtml(payment.status)}</span></div>
  ${payment.transactionId ? `<div class="row"><span>Txn ID</span><span>${escapeHtml(payment.transactionId)}</span></div>` : ""}
  ${payment.notes ? `<div class="row"><span>Notes</span><span>${escapeHtml(payment.notes)}</span></div>` : ""}
  <hr />
  <div class="row total"><span>Amount</span><span>${formatWithCurrency(payment.amount)}</span></div>
  ${payment.refundAmount && parseFloat(payment.refundAmount) > 0 ? `<div class="row"><span>Refunded</span><span>-${formatWithCurrency(payment.refundAmount)}</span></div>` : ""}
  <hr />
  <div class="center">Thank you</div>
  <script>
    window.onload = function() { setTimeout(function(){ window.print(); }, 200); };
  </script>
</body>
</html>`;
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) {
      toast({
        title: "Pop-up blocked",
        description: "Allow pop-ups to print the receipt.",
        variant: "destructive",
      });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const folioBalance = selectedFolio ? parseFloat(selectedFolio.balance) || 0 : 0;
  const isFolioOpen = selectedFolio?.status === "open";
  const canCloseFolio = isFolioOpen && Math.abs(folioBalance) < 0.01;

  return (
    <div className="p-6 space-y-6" data-testid="page-billing">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
            Billing & Folios
          </h1>
          <p className="text-muted-foreground">Manage guest billing, charges, and payments</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Display Currency:</span>
          <Select value={targetCurrency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LKR">LKR (Rs.)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Billing Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              {summaryLoading
                ? "..."
                : formatWithCurrency((billingSummary as any)?.summary?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">All completed transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-outstanding-balance">
              {summaryLoading
                ? "..."
                : formatWithCurrency((billingSummary as any)?.summary?.totalOutstanding || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Unpaid amounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Charges</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-charges">
              {summaryLoading
                ? "..."
                : formatWithCurrency((billingSummary as any)?.summary?.totalCharges || 0)}
            </div>
            <p className="text-xs text-muted-foreground">All posted charges</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search folios by guest name or email..."
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
                  className={`p-3 rounded-md border cursor-pointer hover-elevate transition-colors ${
                    selectedFolio?.id === folio.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedFolio(folio)}
                  data-testid={`card-folio-${folio.id}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm">{folio.folioNumber}</h4>
                    {getStatusBadge(folio.status)}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between gap-2">
                      <span>Charges:</span>
                      <span className="font-medium">{formatWithCurrency(folio.totalCharges)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Payments:</span>
                      <span className="font-medium">{formatWithCurrency(folio.totalPayments)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Balance:</span>
                      <span
                        className={`font-medium ${
                          parseFloat(folio.balance) > 0
                            ? "text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {formatWithCurrency(folio.balance)}
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
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {selectedFolio.folioNumber}
                        {getStatusBadge(selectedFolio.status)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(selectedFolio.createdAt), "MMM dd, yyyy")} ·
                        Balance{" "}
                        <span
                          className={
                            folioBalance > 0 ? "text-destructive font-medium" : "font-medium"
                          }
                        >
                          {formatWithCurrency(selectedFolio.balance)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrintInvoice}
                      data-testid="button-print-invoice"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Invoice
                    </Button>
                    {isFolioOpen && (
                      <>
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
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid="button-add-payment"
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Record Payment
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canCloseFolio}
                          onClick={() => setShowCloseFolioDialog(true)}
                          data-testid="button-close-folio"
                          title={
                            canCloseFolio
                              ? "Close this folio"
                              : "Folio can only be closed when balance is zero"
                          }
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Close Folio
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Notes section */}
                <div className="mb-4 rounded-md border p-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Folio Notes
                    </Label>
                    {!editingNotes && isFolioOpen && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingNotes(true)}
                        data-testid="button-edit-notes"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <Textarea
                        rows={3}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Add internal notes about this folio..."
                        data-testid="textarea-folio-notes"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNotes(false)}
                          data-testid="button-cancel-notes"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateNotesMutation.mutate({
                              id: selectedFolio.id,
                              notes: notesDraft,
                            })
                          }
                          disabled={updateNotesMutation.isPending}
                          data-testid="button-save-notes"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {selectedFolio.notes || (
                        <span className="text-muted-foreground italic">No notes yet.</span>
                      )}
                    </div>
                  )}
                </div>

                <Tabs defaultValue="charges" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="charges" data-testid="tab-charges">
                      Charges ({(folioCharges as any)?.charges?.length ?? 0})
                    </TabsTrigger>
                    <TabsTrigger value="payments" data-testid="tab-payments">
                      Payments ({(folioPayments as any)?.payments?.length ?? 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="charges" className="space-y-4">
                    {chargesLoading ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading charges...
                      </div>
                    ) : (folioCharges as any)?.charges?.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No charges posted
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(folioCharges as any)?.charges?.map((charge: Charge) => (
                          <div
                            key={charge.id}
                            className={`border rounded-md p-3 ${
                              charge.isVoided ? "opacity-60" : ""
                            }`}
                            data-testid={`card-charge-${charge.id}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{charge.description}</span>
                                <Badge variant="outline">{charge.chargeCode}</Badge>
                                {charge.isVoided && <Badge variant="destructive">Voided</Badge>}
                              </div>
                              <span className="font-medium text-lg">
                                {formatWithCurrency(charge.totalAmount)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div className="flex justify-between gap-2 flex-wrap">
                                <span>Amount: {formatWithCurrency(charge.amount)}</span>
                                <span>Tax: {formatWithCurrency(charge.taxAmount)}</span>
                              </div>
                              <div className="flex justify-between gap-2 flex-wrap mt-1">
                                <span>
                                  Posted: {format(new Date(charge.postingDate), "MMM dd, yyyy")}
                                </span>
                                <span>
                                  Charge Date:{" "}
                                  {format(new Date(charge.chargeDate), "MMM dd, yyyy")}
                                </span>
                              </div>
                              {charge.isVoided && charge.voidReason && (
                                <div className="mt-1">
                                  <span className="font-medium">Void reason:</span>{" "}
                                  {charge.voidReason}
                                </div>
                              )}
                            </div>
                            {!charge.isVoided && isFolioOpen && (
                              <div className="flex justify-end mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setChargeToVoid(charge);
                                    voidForm.reset({ voidReason: "" });
                                  }}
                                  data-testid={`button-void-charge-${charge.id}`}
                                >
                                  <Ban className="h-4 w-4 mr-1" />
                                  Void
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="payments" className="space-y-4">
                    {paymentsLoading ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading payments...
                      </div>
                    ) : (folioPayments as any)?.payments?.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No payments recorded
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(folioPayments as any)?.payments?.map((payment: Payment) => (
                          <div
                            key={payment.id}
                            className="border rounded-md p-3"
                            data-testid={`card-payment-${payment.id}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium capitalize">
                                  {payment.paymentMethod.replace("_", " ")}
                                </span>
                                {getPaymentStatusBadge(payment.status)}
                              </div>
                              <span className="font-medium text-lg">
                                {formatWithCurrency(payment.amount)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div className="flex justify-between gap-2 flex-wrap">
                                <span>Transaction ID: {payment.transactionId || "N/A"}</span>
                                <span>
                                  Date: {format(new Date(payment.paymentDate), "MMM dd, yyyy")}
                                </span>
                              </div>
                              {payment.notes && <div className="mt-1">Notes: {payment.notes}</div>}
                              {payment.status === "refunded" && (
                                <div className="mt-1">
                                  <span className="font-medium">Refunded:</span>{" "}
                                  {formatWithCurrency(payment.refundAmount || 0)}
                                  {payment.refundReason && (
                                    <>
                                      {" "}
                                      &mdash; <em>{payment.refundReason}</em>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2 mt-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintReceipt(payment)}
                                data-testid={`button-print-receipt-${payment.id}`}
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                Receipt
                              </Button>
                              {payment.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => completePaymentMutation.mutate(payment.id)}
                                  disabled={completePaymentMutation.isPending}
                                  data-testid={`button-complete-payment-${payment.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark Completed
                                </Button>
                              )}
                              {payment.status === "completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setPaymentToRefund(payment)}
                                  data-testid={`button-refund-payment-${payment.id}`}
                                >
                                  <RefreshCcw className="h-4 w-4 mr-1" />
                                  Refund
                                </Button>
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
            <DialogDescription>
              Tax and total are calculated automatically based on the amount, tax rate, and
              discount you enter.
            </DialogDescription>
          </DialogHeader>
          <Form {...chargeForm}>
            <form
              onSubmit={chargeForm.handleSubmit(handleCreateCharge)}
              className="space-y-4"
            >
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
                            <SelectItem value="LAUNDRY">Laundry</SelectItem>
                            <SelectItem value="MINIBAR">Minibar</SelectItem>
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
                      <FormLabel>Amount (Rs.)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
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
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (Rs.)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          data-testid="input-charge-discount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={chargeForm.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          data-testid="input-charge-tax-rate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={chargeForm.control}
                  name="taxAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Amount (auto)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          readOnly
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
                      <FormLabel>Total Amount (auto)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          readOnly
                          {...field}
                          data-testid="input-total-amount"
                          className="font-semibold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
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
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedFolio
                ? `Outstanding balance: ${formatWithCurrency(selectedFolio.balance)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form
              onSubmit={paymentForm.handleSubmit(handleCreatePayment)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount (Rs.)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
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
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        rows={3}
                        data-testid="textarea-payment-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
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
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Void Charge Dialog */}
      <Dialog open={!!chargeToVoid} onOpenChange={(open) => !open && setChargeToVoid(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Void Charge</DialogTitle>
            <DialogDescription>
              {chargeToVoid && (
                <>
                  Voiding <strong>{chargeToVoid.description}</strong> for{" "}
                  {formatWithCurrency(chargeToVoid.totalAmount)}. This action will reverse the
                  charge from the folio total.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...voidForm}>
            <form onSubmit={voidForm.handleSubmit(handleVoidCharge)} className="space-y-4">
              <FormField
                control={voidForm.control}
                name="voidReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Why is this charge being voided?"
                        {...field}
                        data-testid="textarea-void-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChargeToVoid(null)}
                  data-testid="button-cancel-void"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={voidChargeMutation.isPending}
                  data-testid="button-confirm-void"
                >
                  {voidChargeMutation.isPending ? "Voiding..." : "Confirm Void"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Refund Payment Dialog */}
      <Dialog
        open={!!paymentToRefund}
        onOpenChange={(open) => !open && setPaymentToRefund(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refund Payment</DialogTitle>
            <DialogDescription>
              {paymentToRefund && (
                <>
                  Refunding payment of{" "}
                  <strong>{formatWithCurrency(paymentToRefund.amount)}</strong> via{" "}
                  {paymentToRefund.paymentMethod}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...refundForm}>
            <form
              onSubmit={refundForm.handleSubmit(handleRefundPayment)}
              className="space-y-4"
            >
              <FormField
                control={refundForm.control}
                name="refundAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refund Amount (Rs.)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        data-testid="input-refund-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={refundForm.control}
                name="refundReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Why is this payment being refunded?"
                        {...field}
                        data-testid="textarea-refund-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentToRefund(null)}
                  data-testid="button-cancel-refund"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={refundPaymentMutation.isPending}
                  data-testid="button-confirm-refund"
                >
                  {refundPaymentMutation.isPending ? "Refunding..." : "Confirm Refund"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Close Folio Dialog */}
      <Dialog open={showCloseFolioDialog} onOpenChange={setShowCloseFolioDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close Folio</DialogTitle>
            <DialogDescription>
              {selectedFolio && (
                <>
                  Closing folio <strong>{selectedFolio.folioNumber}</strong> will lock it from
                  any further charges or payments. This is typically done after check-out when
                  the balance is settled.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCloseFolioDialog(false)}
              data-testid="button-cancel-close-folio"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => selectedFolio && closeFolioMutation.mutate(selectedFolio.id)}
              disabled={closeFolioMutation.isPending}
              data-testid="button-confirm-close-folio"
            >
              {closeFolioMutation.isPending ? "Closing..." : "Confirm Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
