import { useRoute, useLocation } from "wouter";
import { useBookings, useUpdateBooking, useDeleteBooking, useAgencies, useCreateBooking } from "@/hooks/use-bookings";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Trash2, ArrowLeft, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo } from "react";
import { api, type InsertBooking } from "@shared/routes";

// Schema for the form - needs to handle Date objects from picker
const formSchema = z.object({
  guestName: z.string().min(1, "Guest name is required"),
  agencyId: z.coerce.number().optional(),
  checkIn: z.date(),
  checkOut: z.date(),
  roomRent: z.coerce.number().min(0),
  addOns: z.coerce.number().min(0).default(0),
  receipt: z.coerce.number().min(0).default(0),
  status: z.enum(["confirmed", "checked_in", "checked_out", "cancelled"]),
  hotelId: z.number(), // Hidden field
  numberOfRooms: z.coerce.number().min(1, "Number of rooms must be at least 1"),
  comments: z.string().optional(),
  receiptComment: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status === "checked_out" && (!data.receiptComment || data.receiptComment.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Receipt Comment is required when checking out",
      path: ["receiptComment"],
    });
  }
});

export default function BookingDetail() {
  const [match, params] = useRoute("/bookings/:id");
  const [, setLocation] = useLocation();
  const isNew = match && params?.id === "new";
  const id = match && !isNew ? parseInt(params!.id) : undefined;

  const { data: bookings, isLoading: isLoadingBookings } = useBookings();
  const { data: agencies } = useAgencies();
  const { user } = useAuth();

  const createMutation = useCreateBooking();
  const updateMutation = useUpdateBooking();
  const deleteMutation = useDeleteBooking();

  const booking = bookings?.find(b => b.id === id);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: "",
      roomRent: 0,
      addOns: 0,
      receipt: 0,
      status: "confirmed",
      checkIn: new Date(),
      checkOut: new Date(new Date().setDate(new Date().getDate() + 1)),
      hotelId: user?.hotelId || 1, // Default fallback
      numberOfRooms: 1,
      comments: "",
      receiptComment: "",
    },
  });

  useEffect(() => {
    if (booking) {
      form.reset({
        guestName: booking.guestName,
        agencyId: booking.agencyId || undefined,
        checkIn: new Date(booking.checkIn),
        checkOut: new Date(booking.checkOut),
        roomRent: booking.roomRent / 100, // Convert cents to dollars for input
        addOns: booking.addOns / 100,
        receipt: booking.receipt / 100,
        status: booking.status as any,
        hotelId: booking.hotelId,
        numberOfRooms: booking.numberOfRooms || 1,
        comments: booking.comments || "",
        receiptComment: booking.receiptComment || "",
      });
    }
  }, [booking, form]);

  // Real-time calculation logic
  const roomRent = form.watch("roomRent");
  const addOns = form.watch("addOns");
  const receipt = form.watch("receipt");
  const status = form.watch("status"); // Watch status to trigger UI changes

  const totalCost = (Number(roomRent) || 0) + (Number(addOns) || 0);
  const balance = totalCost - (Number(receipt) || 0);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const payload: InsertBooking = {
      ...data,
      roomRent: Math.round(data.roomRent * 100), // Convert to cents
      addOns: Math.round(data.addOns * 100),
      receipt: Math.round(data.receipt * 100),
      // totalCost and balance are handled by backend or logic
      totalCost: Math.round(totalCost * 100),
    };

    if (isNew) {
      createMutation.mutate(payload, {
        onSuccess: () => setLocation("/bookings"),
      });
    } else if (id) {
      updateMutation.mutate({ id, ...payload }, {
        onSuccess: () => setLocation("/bookings"),
      });
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this booking?")) {
      deleteMutation.mutate(id!, {
        onSuccess: () => setLocation("/bookings"),
      });
    }
  };

  if (isLoadingBookings && !isNew) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/bookings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold font-display">{isNew ? "New Booking" : "Edit Booking"}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guest Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="h-12 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numberOfRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Rooms</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" className="h-12 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments</FormLabel>
                    <FormControl>
                      <Input placeholder="Extra towels, late check-in, etc." className="h-12 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkIn"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-in Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "h-12 w-full pl-3 text-left font-normal rounded-xl",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="checkOut"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-out Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "h-12 w-full pl-3 text-left font-normal rounded-xl",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < form.getValues("checkIn")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="roomRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Rent ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="h-12 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addOns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Add-ons ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="h-12 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="agencyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agency (Optional)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Select Agency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">None (Direct)</SelectItem>
                          {agencies?.map(a => (
                            <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="checked_in">Checked In</SelectItem>
                          <SelectItem value="checked_out">Checked Out</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 border-t border-dashed">
                <FormField
                  control={form.control}
                  name="receipt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Received (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="h-12 rounded-xl border-green-200 focus:border-green-500 bg-green-50/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditionally render Receipt Comment when status is Checked Out */}
                {status == "checked_out" && (
                  <FormField
                    control={form.control}
                    name="receiptComment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receipt Comment <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Invoice #, Check details, etc." className="h-12 rounded-xl" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Booking</>}
                </Button>

                {!isNew && user?.role !== 'manager' && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="h-12 w-12 rounded-xl p-0"
                  >
                    {deleteMutation.isPending ? <Loader2 className="animate-spin" /> : <Trash2 className="h-5 w-5" />}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>

        {/* Live Calculation Card */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-primary/10 sticky top-8">
            <h3 className="font-display font-bold text-xl mb-4 text-primary">Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Room Rent</span>
                <span className="font-medium">${Number(roomRent).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Add-ons</span>
                <span className="font-medium">${Number(addOns).toFixed(2)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Cost</span>
                <span>${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Paid</span>
                <span>-${Number(receipt).toFixed(2)}</span>
              </div>
              <div className={cn(
                "p-4 rounded-xl flex justify-between font-bold text-lg",
                balance > 0 ? "bg-destructive/10 text-destructive" : "bg-green-100 text-green-800"
              )}>
                <span>{balance > 0 ? "Balance Due" : "Settled"}</span>
                <span>${balance > 0 ? balance.toFixed(2) : "0.00"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
