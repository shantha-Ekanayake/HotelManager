import ReservationCard from '../ReservationCard';

export default function ReservationCardExample() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      <ReservationCard
        id="RSV-001"
        guestName="Sarah Johnson"
        roomNumber="205"
        roomType="Deluxe King Suite"
        checkIn="Dec 22, 2024"
        checkOut="Dec 25, 2024"
        status="confirmed"
        totalAmount={450.00}
        guestEmail="sarah.j@email.com"
        guestPhone="+1 (555) 123-4567"
        specialRequests="Late check-in requested, hypoallergenic pillows"
        onCheckIn={() => console.log('Check in clicked')}
        onViewDetails={() => console.log('View details clicked')}
      />
      
      <ReservationCard
        id="RSV-002"
        guestName="Michael Chen"
        roomNumber="102"
        roomType="Standard Queen"
        checkIn="Dec 20, 2024"
        checkOut="Dec 22, 2024"
        status="checked-in"
        totalAmount={280.00}
        guestEmail="m.chen@company.com"
        guestPhone="+1 (555) 987-6543"
        onCheckOut={() => console.log('Check out clicked')}
        onViewDetails={() => console.log('View details clicked')}
      />
    </div>
  );
}