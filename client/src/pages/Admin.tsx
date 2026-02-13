import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useHotels, useCreateHotel, useDeleteHotel } from "@/hooks/use-hotels";
import { useUsers, useCreateUser, useDeleteUser } from "@/hooks/use-users";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Building, User as UserIcon, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHotelSchema, insertUserSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function Admin() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center">Access Denied</div>;
  }

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8">
      <h1 className="text-3xl font-bold font-display mb-6">System Admin</h1>

      <Tabs defaultValue="hotels" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="hotels">
          <HotelsManager />
        </TabsContent>
        <TabsContent value="users">
          <UsersManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HotelsManager() {
  const { data: hotels, isLoading } = useHotels();
  const createMutation = useCreateHotel();
  const deleteMutation = useDeleteHotel();
  const queryClient = useQueryClient();

  const [editingHotel, setEditingHotel] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/hotels/${editingHotel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hotels"] }),
  });

  const form = useForm({
    resolver: zodResolver(insertHotelSchema),
    defaultValues: { name: "", totalRooms: 10, startDate: new Date(), endDate: new Date() }
  });

  useEffect(() => {
    if (editingHotel) {
      form.reset({
        name: editingHotel.name,
        totalRooms: editingHotel.totalRooms,
        // Ensure values are formatted as proper Date objects for React Hook Form
        startDate: editingHotel.startDate ? new Date(editingHotel.startDate) : undefined,
        endDate: editingHotel.endDate ? new Date(editingHotel.endDate) : undefined,
      });
    } else {
      form.reset({ name: "", totalRooms: 10, startDate: undefined, endDate: undefined });
    }
  }, [editingHotel, form]);

  const onSubmit = (data: any) => {
    if (editingHotel) {
      updateMutation.mutate(data, {
        onSuccess: () => {
          setIsOpen(false);
          setEditingHotel(null);
          form.reset();
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setIsOpen(false);
          form.reset();
        }
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Properties</h2>
        <Button onClick={() => { setEditingHotel(null); setIsOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Hotel
        </Button>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditingHotel(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHotel ? "Edit Hotel" : "Add New Hotel"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Rooms</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            name={field.name}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val ? new Date(val) : null);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            name={field.name}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val ? new Date(val) : null);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                  {editingHotel ? "Update" : "Create"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {hotels?.map((hotel) => (
          <div key={hotel.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold">{hotel.name}</p>
                <p className="text-sm text-muted-foreground">{hotel.totalRooms} Rooms</p>
                {hotel.endDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires: {new Date(hotel.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setEditingHotel(hotel); setIsOpen(true); }}
              >
                <Edit className="h-4 w-4 text-blue-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm('Delete this hotel?')) deleteMutation.mutate(hotel.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersManager() {
  const { data: users } = useUsers();
  const { data: hotels } = useHotels();
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();
  const queryClient = useQueryClient();

  const [editingUser, setEditingUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
  });

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "manager", hotelId: 0 }
  });

  useEffect(() => {
    if (editingUser) {
      form.reset({
        name: editingUser.name,
        email: editingUser.email,
        password: "********", // Dummy password to bypass validation on Edit UI 
        role: editingUser.role,
        hotelId: editingUser.hotelId || 0
      });
    } else {
      form.reset({ name: "", email: "", password: "", role: "manager", hotelId: 0 });
    }
  }, [editingUser, form]);

  const onSubmit = (data: any) => {
    const payload = { ...data, hotelId: data.hotelId === 0 ? null : data.hotelId };

    // If we're editing and password hasn't changed, don't pass it back
    if (editingUser && data.password === "********") {
      delete payload.password;
    }

    if (editingUser) {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          setIsOpen(false);
          setEditingUser(null);
          form.reset();
        }
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setIsOpen(false);
          form.reset();
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Team Members</h2>
        <Button onClick={() => { setEditingUser(null); setIsOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditingUser(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={editingUser ? "Leave '********' to keep current" : ""} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hotelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Hotel</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value?.toString() || "0"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select hotel" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">Unassigned</SelectItem>
                          {hotels?.map(h => (
                            <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                  {editingUser ? "Update User" : "Create User"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {users?.map((user) => (
          <div key={user.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 text-accent rounded-lg">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold">{user.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{user.role} • {hotels?.find(h => h.id === user.hotelId)?.name || 'Unassigned'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setEditingUser(user); setIsOpen(true); }}
              >
                <Edit className="h-4 w-4 text-blue-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm('Delete this user?')) deleteMutation.mutate(user.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}