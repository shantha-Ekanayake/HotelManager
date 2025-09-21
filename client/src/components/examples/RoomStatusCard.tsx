import RoomStatusCard from '../RoomStatusCard';

export default function RoomStatusCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <RoomStatusCard
        roomNumber="101"
        roomType="Standard King"
        status="occupied"
        guestName="John Doe"
        checkIn="Dec 20"
        checkOut="Dec 23"
        amenities={["WiFi", "Coffee", "Parking"]}
        onStatusChange={(status) => console.log('Status changed:', status)}
        onViewDetails={() => console.log('View details clicked')}
      />
      
      <RoomStatusCard
        roomNumber="102"
        roomType="Deluxe Queen"
        status="dirty"
        amenities={["WiFi", "Business"]}
        onStatusChange={(status) => console.log('Status changed:', status)}
        onViewDetails={() => console.log('View details clicked')}
      />
      
      <RoomStatusCard
        roomNumber="103"
        roomType="Suite"
        status="clean"
        amenities={["WiFi", "Coffee", "Parking", "Business"]}
        onStatusChange={(status) => console.log('Status changed:', status)}
        onViewDetails={() => console.log('View details clicked')}
      />
    </div>
  );
}