import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  Download,
  Calendar,
  FileText,
  PieChart,
  BarChart3,
  AlertCircle
} from 'lucide-react';

export default function FinancialReports() {
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    toDate: new Date().toISOString().split('T')[0] // Today
  });

  // Financial Dashboard Query
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: [`/api/financial-reports/financial-dashboard?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`],
    enabled: !!(dateRange.fromDate && dateRange.toDate),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Folio Summary Query
  const { data: folioData, isLoading: isFolioLoading } = useQuery({
    queryKey: [`/api/financial-reports/folio-summary?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`],
    enabled: !!(dateRange.fromDate && dateRange.toDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Charges Analysis Query
  const { data: chargesData, isLoading: isChargesLoading } = useQuery({
    queryKey: [`/api/financial-reports/charges-analysis?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`],
    enabled: !!(dateRange.fromDate && dateRange.toDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Payment Analysis Query
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery({
    queryKey: [`/api/financial-reports/payment-analysis?fromDate=${dateRange.fromDate}&toDate=${dateRange.toDate}`],
    enabled: !!(dateRange.fromDate && dateRange.toDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleDateRangeChange = (field: 'fromDate' | 'toDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const exportAccountingData = async () => {
    try {
      const params = new URLSearchParams(dateRange);
      const response = await fetch(`/api/financial-reports/accounting-export?${params}`);
      const data = await response.json();
      
      // Convert to CSV and download
      const csvContent = generateCSV(data.exportData);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_export_${dateRange.fromDate}_to_${dateRange.toDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const generateCSV = (exportData: any) => {
    const headers = ['Date', 'Folio Number', 'Guest Name', 'Charge Code', 'Description', 'Amount', 'Tax', 'Total'];
    const rows = exportData.folioCharges.map((charge: any) => [
      charge.chargeDate,
      charge.folioNumber,
      charge.guestName,
      charge.chargeCode,
      charge.description,
      charge.amount.toFixed(2),
      charge.taxAmount.toFixed(2),
      charge.totalAmount.toFixed(2)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  };

  if (dashboardError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center space-y-4 p-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Unable to Load Reports</h3>
              <p className="text-muted-foreground text-sm mt-1">
                There was an error loading the financial reports. Please try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Financial Reports</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Comprehensive financial analytics and reporting dashboard
          </p>
        </div>
        <Button 
          onClick={exportAccountingData} 
          variant="outline" 
          className="flex items-center gap-2"
          data-testid="button-export-data"
        >
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={dateRange.fromDate}
                onChange={(e) => handleDateRangeChange('fromDate', e.target.value)}
                data-testid="input-from-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={dateRange.toDate}
                onChange={(e) => handleDateRangeChange('toDate', e.target.value)}
                data-testid="input-to-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="folios" data-testid="tab-folios">Folios</TabsTrigger>
          <TabsTrigger value="charges" data-testid="tab-charges">Charges</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isDashboardLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-7 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : dashboardData && (dashboardData as any).dashboard ? (
            <>
              {/* Key Metrics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card data-testid="card-total-revenue">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-revenue">
                      {formatCurrency((dashboardData as any).dashboard.summary.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ADR: {formatCurrency((dashboardData as any).dashboard.summary.avgDailyRate)}
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-payments">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-payments">
                      {formatCurrency((dashboardData as any).dashboard.summary.totalPayments)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      RevPAR: {formatCurrency((dashboardData as any).dashboard.summary.revpar)}
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-outstanding-balance">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-outstanding-balance">
                      {formatCurrency((dashboardData as any).dashboard.summary.outstandingBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {(dashboardData as any).dashboard.summary.outstandingBalance > 0 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-red-500" />
                          <span className="text-red-500">Needs attention</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-green-500" />
                          <span className="text-green-500">All clear</span>
                        </>
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-folios">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Folios</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-folios">
                      {(dashboardData as any).dashboard.folioMetrics.totalFolios}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(dashboardData as any).dashboard.folioMetrics.openFolios} open, {(dashboardData as any).dashboard.folioMetrics.closedFolios} closed
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Methods Breakdown */}
              <Card data-testid="card-payment-methods">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries((dashboardData as any).dashboard.paymentMetrics.paymentsByMethod).map(([method, data]: [string, any]) => (
                      <div key={method} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{method}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {data.count} transactions
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(data.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            Avg: {formatCurrency(data.avgAmount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Charge Types */}
              <Card data-testid="card-charge-types">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Charge Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(dashboardData as any).dashboard.chargeMetrics.topChargeTypes.map((charge: any) => (
                      <div key={charge.code} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{charge.code}</div>
                          <div className="text-sm text-muted-foreground">{charge.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(charge.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            {charge.count} charges
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No financial data available for the selected period.</p>
            </div>
          )}
        </TabsContent>

        {/* Folios Tab */}
        <TabsContent value="folios" className="space-y-6">
          {isFolioLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-20 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : folioData && (folioData as any).report ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Folios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(folioData as any).report.totalFolios}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Average Folio Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency((folioData as any).report.avgFolioValue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Outstanding Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency((folioData as any).report.outstandingBalance)}</div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        {/* Charges Tab */}
        <TabsContent value="charges" className="space-y-6">
          {isChargesLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-20 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : chargesData && (chargesData as any).report ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Charges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency((chargesData as any).report.totalCharges)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Taxes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency((chargesData as any).report.totalTaxes)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Voided Charges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency((chargesData as any).report.voidedCharges.amount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(chargesData as any).report.voidedCharges.count} voided
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          {isPaymentsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-20 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : paymentsData && (paymentsData as any).report ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency((paymentsData as any).report.totalPayments)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Refunds</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency((paymentsData as any).report.refundsAnalysis.totalRefunds)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(paymentsData as any).report.refundsAnalysis.refundCount} refunds
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}