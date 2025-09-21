import DashboardHeader from '../DashboardHeader';
import { ThemeProvider } from '../ThemeProvider';

export default function DashboardHeaderExample() {
  return (
    <ThemeProvider>
      <DashboardHeader 
        userName="John Smith"
        userRole="Manager" 
        notifications={3}
        onMenuClick={() => console.log('Menu clicked')}
      />
    </ThemeProvider>
  );
}