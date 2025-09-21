import StatsCards from '../StatsCards';
import { Users, Bed, DollarSign, Calendar } from 'lucide-react';

export default function StatsCardsExample() {
  const mockStats = [
    {
      title: "Total Rooms",
      value: 120,
      change: 0,
      changeLabel: "rooms total",
      icon: <Bed className="h-4 w-4" />,
      color: "default" as const
    },
    {
      title: "Occupancy Rate",
      value: "85%",
      change: 12,
      changeLabel: "from last month",
      icon: <Users className="h-4 w-4" />,
      color: "success" as const
    },
    {
      title: "Revenue Today",
      value: "$12,450",
      change: 8,
      changeLabel: "from yesterday",
      icon: <DollarSign className="h-4 w-4" />,
      color: "success" as const
    },
    {
      title: "Check-ins Today",
      value: 28,
      change: -5,
      changeLabel: "from yesterday",
      icon: <Calendar className="h-4 w-4" />,
      color: "warning" as const
    }
  ];

  return (
    <div className="p-4">
      <StatsCards stats={mockStats} />
    </div>
  );
}