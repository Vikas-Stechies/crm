import { useAgencies } from "@/hooks/use-bookings";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Plus, Trash2, Edit2, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAgencySchema } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient"; // Import the helper

export default function Agencies() {
  const { data: agencies, isLoading } = useAgencies();
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Use apiRequest to handle absolute URLs and credentials automatically
      const res = await apiRequest("POST", api.agencies.create.path, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agencies.list.path] });
      toast({ title: "Agency created" });
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      // Use apiRequest for updates
      const res = await apiRequest("PATCH", buildUrl(api.agencies.update.path, { id }), data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agencies.list.path] });
      setEditingId(null);
      toast({ title: "Agency updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // apiRequest throws automatically on error
      await apiRequest("DELETE", buildUrl(api.agencies.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agencies.list.path] });
      toast({ title: "Agency deleted" });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertAgencySchema),
    defaultValues: { name: "", contactEmail: "", contactPhone: "" },
  });

  const onSubmit = (data: any) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (agency: any) => {
    setEditingId(agency.id);
    form.reset({
      name: agency.name,
      contactEmail: agency.contactEmail || "",
      contactPhone: agency.contactPhone || "",
    });
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <h1 className="text-2xl md:text-3xl font-bold font-display">Agencies</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/50">
          <h2 className="text-xl font-bold mb-4">{editingId ? "Edit Agency" : "Add New Agency"}</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agency Name</FormLabel>
                    <FormControl><Input placeholder="Booking.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input placeholder="contact@agency.com" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+1234567890" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Update Agency" : "Add Agency"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => { setEditingId(null); form.reset(); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Existing Agencies</h2>
          {agencies?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No agencies found</p>
            </div>
          ) : (
            agencies?.map((agency) => (
              <div key={agency.id} className="bg-white p-4 rounded-xl shadow-sm border border-border/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{agency.name}</h3>
                  <p className="text-sm text-muted-foreground">{agency.contactEmail || "No email"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(agency)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(agency.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}