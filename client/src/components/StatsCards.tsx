import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: "default" | "success" | "warning" | "error";
}

interface StatsCardsProps {
  stats: StatCardProps[];
}

function StatCard({ title, value, change, changeLabel, icon, color = "default" }: StatCardProps) {
  const getTrendIcon = () => {
    if (change === undefined) return <Minus className="h-3 w-3" />;
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return "text-muted-foreground";
    if (change > 0) return "text-hotel-success";
    if (change < 0) return "text-hotel-error";
    return "text-muted-foreground";
  };

  const getValueColor = () => {
    switch (color) {
      case "success": return "text-hotel-success";
      case "warning": return "text-hotel-warning";
      case "error": return "text-hotel-error";
      default: return "text-foreground";
    }
  };

  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1" data-testid={`text-stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          <span className={getValueColor()}>{value}</span>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span data-testid={`text-stat-change-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {Math.abs(change)}% {changeLabel || "from last month"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

export { StatCard };