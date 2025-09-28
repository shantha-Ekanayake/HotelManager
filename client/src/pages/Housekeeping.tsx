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
import { insertHousekeepingTaskSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  ClipboardList, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  Bed,
  Filter,
  Calendar,
  PlayCircle,
  PauseCircle,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Room {
  id: string;
  number: string;
  floor: number;
  status: 'available' | 'occupied' | 'dirty' | 'clean' | 'inspected' | 'out_of_order' | 'maintenance';
  roomType: {
    name: string;
  };
}

interface HousekeepingTask {
  id: string;
  propertyId: string;
  roomId: string;
  assignedTo?: string;
  taskType: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'inspected' | 'cancelled';
  estimatedDuration?: number;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  inspectedBy?: string;
  inspectedAt?: string;
  inspectionNotes?: string;
  createdAt: string;
  updatedAt: string;
  room?: Room;
  assignee?: { firstName: string; lastName: string; };
}

const taskFormSchema = insertHousekeepingTaskSchema.extend({
  roomId: z.string().min(1, "Room is required"),
  taskType: z.string().min(1, "Task type is required"),
});

export default function Housekeeping() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);

  // Get authenticated user's property
  const { data: userProperty } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/me");
      return response.json();
    },
  });

  const propertyId = userProperty?.user?.propertyId;

  // Get housekeeping tasks by property
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/properties", propertyId, "housekeeping-tasks"],
    queryFn: async () => {
      if (!propertyId) throw new Error("Property ID required");
      const response = await apiRequest("GET", `/api/properties/${propertyId}/housekeeping-tasks`);
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Get user's assigned tasks
  const { data: myTasksData, isLoading: myTasksLoading } = useQuery({
    queryKey: ["/api/housekeeping-tasks/my-tasks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/housekeeping-tasks/my-tasks");
      return response.json();
    },
  });

  // Get rooms for task assignment
  const { data: roomsData } = useQuery({
    queryKey: ["/api/properties", propertyId, "rooms"],
    queryFn: async () => {
      if (!propertyId) throw new Error("Property ID required");
      const response = await apiRequest("GET", `/api/properties/${propertyId}/rooms`);
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Get staff users for task assignment
  const { data: staffData } = useQuery({
    queryKey: ["/api/users/staff", propertyId],
    queryFn: async () => {
      if (!propertyId) throw new Error("Property ID required");
      const response = await apiRequest("GET", `/api/users?propertyId=${propertyId}`);
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Create task form
  const taskForm = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      roomId: "",
      taskType: "cleaning",
      priority: "medium",
      estimatedDuration: 30,
      notes: "",
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: z.infer<typeof taskFormSchema>) => {
      const response = await apiRequest("POST", "/api/housekeeping-tasks", {
        ...data,
        propertyId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Task created successfully" });
      setShowCreateDialog(false);
      taskForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "housekeeping-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/housekeeping-tasks/my-tasks"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating task", 
        description: error.message || "Failed to create task",
        variant: "destructive" 
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      const response = await apiRequest("PUT", `/api/housekeeping-tasks/${taskId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Task updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "housekeeping-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/housekeeping-tasks/my-tasks"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating task", 
        description: error.message || "Failed to update task",
        variant: "destructive" 
      });
    },
  });

  const handleCreateTask = (data: z.infer<typeof taskFormSchema>) => {
    createTaskMutation.mutate(data);
  };

  const handleStartTask = (taskId: string) => {
    updateTaskMutation.mutate({
      taskId,
      updates: {
        status: 'in_progress',
      }
    });
  };

  const handleCompleteTask = (taskId: string) => {
    updateTaskMutation.mutate({
      taskId,
      updates: {
        status: 'completed',
      }
    });
  };

  const handleInspectTask = (notes: string) => {
    if (!selectedTask) return;
    updateTaskMutation.mutate({
      taskId: selectedTask.id,
      updates: {
        status: 'inspected',
        inspectionNotes: notes,
      }
    });
    setShowInspectionDialog(false);
    setSelectedTask(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'in_progress':
        return <Badge variant="default"><PlayCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'completed':
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'inspected':
        return <Badge className="bg-green-600 text-white"><Eye className="h-3 w-3 mr-1" />Inspected</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline" className="text-green-600">Low</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-blue-600">Medium</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-orange-600">High</Badge>;
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Filter tasks based on current filters
  const filteredTasks = (tasksData?.tasks || []).filter((task: HousekeepingTask) => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    return true;
  });

  // Get summary statistics
  const taskStats = {
    total: tasksData?.tasks?.length || 0,
    pending: tasksData?.tasks?.filter((t: HousekeepingTask) => t.status === 'pending').length || 0,
    inProgress: tasksData?.tasks?.filter((t: HousekeepingTask) => t.status === 'in_progress').length || 0,
    completed: tasksData?.tasks?.filter((t: HousekeepingTask) => t.status === 'completed' || t.status === 'inspected').length || 0,
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-housekeeping">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Housekeeping</h1>
          <p className="text-muted-foreground">Manage room cleaning tasks and staff assignments</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-task">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tasks">{taskStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-tasks">{taskStats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-inprogress-tasks">{taskStats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-tasks">{taskStats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all-tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all-tasks" data-testid="tab-all-tasks">All Tasks</TabsTrigger>
          <TabsTrigger value="my-tasks" data-testid="tab-my-tasks">My Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="all-tasks" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="inspected">Inspected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* All Tasks List */}
          <Card>
            <CardHeader>
              <CardTitle>All Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="text-center py-4">Loading tasks...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No tasks found</div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task: HousekeepingTask) => (
                    <div 
                      key={task.id} 
                      className="border rounded-lg p-4"
                      data-testid={`card-task-${task.id}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Bed className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Room {task.room?.number || task.roomId}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">({task.taskType})</span>
                          {getStatusBadge(task.status)}
                          {getPriorityBadge(task.priority)}
                        </div>
                        <div className="flex gap-2">
                          {task.status === 'pending' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStartTask(task.id)}
                              data-testid={`button-start-${task.id}`}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}
                          {task.status === 'in_progress' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleCompleteTask(task.id)}
                              data-testid={`button-complete-${task.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                          {task.status === 'completed' && !task.inspectedAt && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedTask(task);
                                setShowInspectionDialog(true);
                              }}
                              data-testid={`button-inspect-${task.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Inspect
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Assigned to:</span><br />
                          {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span><br />
                          {task.estimatedDuration || 'N/A'} minutes
                        </div>
                        <div>
                          <span className="font-medium">Created:</span><br />
                          {format(new Date(task.createdAt), "MMM dd, HH:mm")}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span><br />
                          {task.startedAt && format(new Date(task.startedAt), "MMM dd, HH:mm")}
                          {task.completedAt && ` - ${format(new Date(task.completedAt), "MMM dd, HH:mm")}`}
                        </div>
                      </div>
                      
                      {task.notes && (
                        <div className="mt-3 p-2 bg-muted rounded text-sm">
                          <span className="font-medium">Notes:</span> {task.notes}
                        </div>
                      )}
                      
                      {task.inspectionNotes && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                          <span className="font-medium">Inspection Notes:</span> {task.inspectionNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-tasks" className="space-y-4">
          {/* My Tasks List */}
          <Card>
            <CardHeader>
              <CardTitle>My Assigned Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {myTasksLoading ? (
                <div className="text-center py-4">Loading your tasks...</div>
              ) : (myTasksData?.tasks || []).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No tasks assigned to you</div>
              ) : (
                <div className="space-y-3">
                  {(myTasksData?.tasks || []).map((task: HousekeepingTask) => (
                    <div 
                      key={task.id} 
                      className="border rounded-lg p-4"
                      data-testid={`card-my-task-${task.id}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Bed className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Room {task.room?.number || task.roomId}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">({task.taskType})</span>
                          {getStatusBadge(task.status)}
                          {getPriorityBadge(task.priority)}
                        </div>
                        <div className="flex gap-2">
                          {task.status === 'pending' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStartTask(task.id)}
                              data-testid={`button-start-my-${task.id}`}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}
                          {task.status === 'in_progress' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleCompleteTask(task.id)}
                              data-testid={`button-complete-my-${task.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Duration:</span><br />
                          {task.estimatedDuration || 'N/A'} minutes
                        </div>
                        <div>
                          <span className="font-medium">Created:</span><br />
                          {format(new Date(task.createdAt), "MMM dd, HH:mm")}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span><br />
                          {task.startedAt && format(new Date(task.startedAt), "MMM dd, HH:mm")}
                        </div>
                      </div>
                      
                      {task.notes && (
                        <div className="mt-3 p-2 bg-muted rounded text-sm">
                          <span className="font-medium">Notes:</span> {task.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Housekeeping Task</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(handleCreateTask)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="select-room">
                            <SelectValue placeholder="Select room" />
                          </SelectTrigger>
                          <SelectContent>
                            {(roomsData?.rooms || []).map((room: Room) => (
                              <SelectItem key={room.id} value={room.id}>
                                Room {room.number} ({room.roomType.name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="taskType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Type</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="select-task-type">
                            <SelectValue placeholder="Select task type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cleaning">Cleaning</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="inspection">Inspection</SelectItem>
                            <SelectItem value="deep_clean">Deep Clean</SelectItem>
                            <SelectItem value="checkout_clean">Checkout Clean</SelectItem>
                            <SelectItem value="checkin_prep">Check-in Prep</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          value={field.value || ""}
                          data-testid="input-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={taskForm.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To (Optional)</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <SelectTrigger data-testid="select-assignee">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {(staffData?.users || [])
                            .filter((user: any) => user.role?.includes('housekeeping'))
                            .map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={taskForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        value={field.value || ""}
                        placeholder="Additional instructions or notes..."
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTaskMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Inspection Dialog */}
      <Dialog open={showInspectionDialog} onOpenChange={setShowInspectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inspect Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Inspecting task for <strong>Room {selectedTask?.room?.number || selectedTask?.roomId}</strong>
            </p>
            <Textarea 
              placeholder="Inspection notes and feedback..."
              id="inspection-notes"
              data-testid="textarea-inspection"
            />
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowInspectionDialog(false)}
                data-testid="button-cancel-inspection"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const notes = (document.getElementById('inspection-notes') as HTMLTextAreaElement)?.value || '';
                  handleInspectTask(notes);
                }}
                data-testid="button-submit-inspection"
              >
                Complete Inspection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}