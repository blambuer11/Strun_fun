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
  country: z.string().min(2, "Ülke adı en az 2 karakter olmalı"),
  city: z.string().min(2, "Şehir adı en az 2 karakter olmalı"),
  taskTitle: z.string().min(5, "Görev başlığı en az 5 karakter olmalı"),
  taskDescription: z.string().min(10, "Görev açıklaması en az 10 karakter olmalı"),
  solAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Geçerli bir SOL miktarı giriniz",
  }),
  maxWinners: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "Kazanan sayısı en az 1 olmalı",
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
        title: "Hata",
        description: "Görev oluşturmak için giriş yapmalısınız",
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
          title: "Hata",
          description: "Şehir konumu bulunamadı. Lütfen geçerli bir şehir giriniz.",
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
        title: "Başarılı!",
        description: `Ödüllü görev oluşturuldu! ${values.solAmount} SOL havuza yatırıldı.`,
      });

      form.reset();
      setOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Error creating sponsored task:", error);
      toast({
        title: "Hata",
        description: "Görev oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Award className="w-4 h-4" />
          Ödüllü Task Oluştur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ödüllü Görev Oluştur</DialogTitle>
          <DialogDescription>
            Topluluk için ödüllü bir görev oluşturun. Görev tamamlandığında SOL ödülleri
            havuzdan dağıtılacak.
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
                    <FormLabel>Ülke</FormLabel>
                    <FormControl>
                      <Input placeholder="Türkiye" {...field} />
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
                    <FormLabel>Şehir</FormLabel>
                    <FormControl>
                      <Input placeholder="İstanbul" {...field} />
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
                  <FormLabel>Görev Başlığı</FormLabel>
                  <FormControl>
                    <Input placeholder="Tarihi Yerleri Keşfet" {...field} />
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
                  <FormLabel>Görev Açıklaması</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Şehirdeki tarihi mekanları ziyaret et ve fotoğraflarını paylaş..."
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
                    <FormLabel>SOL Ödül Miktarı</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.5" {...field} />
                    </FormControl>
                    <FormDescription>Havuza yatırılacak toplam SOL</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxWinners"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kazanan Sayısı</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormDescription>Ödülü alacak kişi sayısı</FormDescription>
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
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  "Görev Oluştur ve SOL Yatır"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
