import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  Plus, 
  Clock, 
  User, 
  Phone, 
  Car, 
  Coffee, 
  Utensils, 
  Bed, 
  Wrench,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RequestStatus = "pending" | "in-progress" | "completed" | "cancelled";
type RequestType = "maintenance" | "housekeeping" | "concierge" | "dining" | "transportation";

interface ServiceRequest {
  id: string;
  roomNumber: string;
  guestName: string;
  type: RequestType;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: RequestStatus;
  requestedAt: string;
  assignedTo?: string;
  estimatedTime?: string;
}

const requestIcons = {
  maintenance: Wrench,
  housekeeping: Bed,
  concierge: Bell,
  dining: Utensils,
  transportation: Car,
};

const statusConfig = {
  pending: { variant: "secondary" as const, icon: Clock, color: "text-hotel-warning" },
  "in-progress": { variant: "default" as const, icon: AlertCircle, color: "text-primary" },
  completed: { variant: "default" as const, icon: CheckCircle, color: "text-hotel-success" },
  cancelled: { variant: "destructive" as const, icon: XCircle, color: "text-hotel-error" },
};

const priorityConfig = {
  low: { variant: "outline" as const, color: "text-muted-foreground" },
  medium: { variant: "secondary" as const, color: "text-hotel-warning" },
  high: { variant: "destructive" as const, color: "text-hotel-error" },
  urgent: { variant: "destructive" as const, color: "text-hotel-error" },
};

export default function GuestServicesPanel() {
  const { toast } = useToast();
  
  // TODO: remove mock functionality - replace with real data
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([
    {
      id: "REQ-001",
      roomNumber: "205",
      guestName: "Sarah Johnson",
      type: "maintenance",
      description: "Air conditioning not working properly",
      priority: "high",
      status: "pending",
      requestedAt: "2024-12-21 14:30",
      estimatedTime: "30 mins"
    },
    {
      id: "REQ-002",
      roomNumber: "102",
      guestName: "Michael Chen",
      type: "dining",
      description: "Room service - Dinner for 2",
      priority: "medium",
      status: "in-progress",
      requestedAt: "2024-12-21 18:15",
      assignedTo: "Kitchen Staff",
      estimatedTime: "45 mins"
    },
    {
      id: "REQ-003",
      roomNumber: "310",
      guestName: "Emily Davis",
      type: "concierge",
      description: "Restaurant reservation for tonight",
      priority: "low",
      status: "completed",
      requestedAt: "2024-12-21 16:00",
      assignedTo: "Concierge Team"
    }
  ]);

  const [newRequest, setNewRequest] = useState({
    roomNumber: "",
    guestName: "",
    type: "maintenance" as RequestType,
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    estimatedTime: ""
  });

  const handleCreateRequest = () => {
    if (!newRequest.roomNumber || !newRequest.guestName || !newRequest.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const request: ServiceRequest = {
      id: `REQ-${String(serviceRequests.length + 1).padStart(3, '0')}`,
      ...newRequest,
      status: "pending",
      requestedAt: new Date().toLocaleString(),
    };

    setServiceRequests([request, ...serviceRequests]);
    setNewRequest({
      roomNumber: "",
      guestName: "",
      type: "maintenance",
      description: "",
      priority: "medium",
      estimatedTime: ""
    });

    toast({
      title: "Request Created",
      description: `Service request ${request.id} has been created`,
    });
  };

  const updateRequestStatus = (id: string, status: RequestStatus) => {
    setServiceRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status } : req
    ));
    
    toast({
      title: "Status Updated",
      description: `Request ${id} status changed to ${status}`,
    });
  };

  const getFilteredRequests = (status?: RequestStatus) => {
    return status ? serviceRequests.filter(req => req.status === status) : serviceRequests;
  };

  const renderRequestCard = (request: ServiceRequest) => {
    const Icon = requestIcons[request.type];
    const StatusIcon = statusConfig[request.status].icon;

    return (
      <Card key={request.id} className="hover-elevate" data-testid={`card-request-${request.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold" data-testid={`text-request-id-${request.id}`}>
                  {request.id}
                </div>
                <div className="text-sm text-muted-foreground">
                  Room {request.roomNumber} • {request.guestName}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={priorityConfig[request.priority].variant}>
                {request.priority.toUpperCase()}
              </Badge>
              <Badge variant={statusConfig[request.status].variant}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {request.status.replace('-', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm" data-testid={`text-request-description-${request.id}`}>
            {request.description}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Requested: {request.requestedAt}</span>
            {request.estimatedTime && <span>Est. Time: {request.estimatedTime}</span>}
          </div>
          
          {request.assignedTo && (
            <div className="text-xs text-muted-foreground">
              Assigned to: {request.assignedTo}
            </div>
          )}

          {request.status === "pending" && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => updateRequestStatus(request.id, "in-progress")}
                data-testid={`button-start-${request.id}`}
              >
                Start
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => updateRequestStatus(request.id, "cancelled")}
                data-testid={`button-cancel-${request.id}`}
              >
                Cancel
              </Button>
            </div>
          )}

          {request.status === "in-progress" && (
            <Button 
              size="sm" 
              onClick={() => updateRequestStatus(request.id, "completed")}
              data-testid={`button-complete-${request.id}`}
            >
              Mark Complete
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" data-testid="panel-guest-services">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Service Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Room Number *</Label>
              <Input
                id="roomNumber"
                value={newRequest.roomNumber}
                onChange={(e) => setNewRequest({...newRequest, roomNumber: e.target.value})}
                placeholder="205"
                data-testid="input-new-room-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestName">Guest Name *</Label>
              <Input
                id="guestName"
                value={newRequest.guestName}
                onChange={(e) => setNewRequest({...newRequest, guestName: e.target.value})}
                placeholder="John Doe"
                data-testid="input-new-guest-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestType">Request Type</Label>
              <Select value={newRequest.type} onValueChange={(value: RequestType) => 
                setNewRequest({...newRequest, type: value})}>
                <SelectTrigger data-testid="select-new-request-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="concierge">Concierge</SelectItem>
                  <SelectItem value="dining">Dining/Room Service</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={newRequest.priority} onValueChange={(value: "low" | "medium" | "high" | "urgent") => 
                setNewRequest({...newRequest, priority: value})}>
                <SelectTrigger data-testid="select-new-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedTime">Estimated Time</Label>
              <Input
                id="estimatedTime"
                value={newRequest.estimatedTime}
                onChange={(e) => setNewRequest({...newRequest, estimatedTime: e.target.value})}
                placeholder="30 mins"
                data-testid="input-new-estimated-time"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={newRequest.description}
              onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
              placeholder="Describe the service request..."
              rows={3}
              data-testid="textarea-new-description"
            />
          </div>

          <Button onClick={handleCreateRequest} data-testid="button-create-request">
            Create Request
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({serviceRequests.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({getFilteredRequests("pending").length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({getFilteredRequests("in-progress").length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({getFilteredRequests("completed").length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({getFilteredRequests("cancelled").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {serviceRequests.map(renderRequestCard)}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {getFilteredRequests("pending").map(renderRequestCard)}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {getFilteredRequests("in-progress").map(renderRequestCard)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {getFilteredRequests("completed").map(renderRequestCard)}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {getFilteredRequests("cancelled").map(renderRequestCard)}
        </TabsContent>
      </Tabs>
    </div>
  );
}