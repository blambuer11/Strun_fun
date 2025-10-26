import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Award, Loader2 } from "lucide-react";

const formSchema = z.object({
  country: z.string().min(2, "Country name must be at least 2 characters"),
  city: z.string().min(2, "City name must be at least 2 characters"),
  taskTitle: z.string().min(5, "Task title must be at least 5 characters"),
  taskDescription: z.string().min(10, "Task description must be at least 10 characters"),
  solAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Please enter a valid SOL amount",
  }),
  maxWinners: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "Number of winners must be at least 1",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export const CreateSponsoredTaskDialog = () => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: "",
      city: "",
      taskTitle: "",
      taskDescription: "",
      solAmount: "",
      maxWinners: "1",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create tasks",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get coordinates for the city using Nominatim
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(values.city)}&country=${encodeURIComponent(values.country)}&format=json&limit=1`
      );
      const geocodeData = await geocodeResponse.json();

      if (!geocodeData || geocodeData.length === 0) {
        toast({
          title: "Error",
          description: "City location not found. Please enter a valid city.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const lat = parseFloat(geocodeData[0].lat);
      const lon = parseFloat(geocodeData[0].lon);

      // Create sponsored task
      const { data, error } = await supabase.functions.invoke("generate-location-task", {
        body: {
          userId: user.id,
          lat,
          lon,
          city: values.city,
          solPool: parseFloat(values.solAmount),
          maxParticipants: parseInt(values.maxWinners),
          taskDescription: values.taskDescription,
          taskTitle: values.taskTitle,
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Sponsored task created! ${values.solAmount} SOL deposited to pool.`,
      });

      form.reset();
      setOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Error creating sponsored task:", error);
      toast({
        title: "Error",
        description: "An error occurred while creating the task",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-12 text-sm gap-2">
          <Award className="w-4 h-4" />
          <span className="truncate">Create Sponsored Task</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Sponsored Task</DialogTitle>
          <DialogDescription>
            Create a rewarded task for the community. SOL rewards will be distributed from the pool when the task is completed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Turkey" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Istanbul" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="taskTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Explore Historic Places" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taskDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Visit historic places in the city and share your photos..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="solAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SOL Reward Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.5" {...field} />
                    </FormControl>
                    <FormDescription>Total SOL to be deposited to pool</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxWinners"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Winners</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormDescription>Number of people who will receive rewards</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Task & Deposit SOL"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
