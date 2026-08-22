import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const schema = z.object({
  username: z.string().min(1, "username required"),
  password: z.string().min(1, "password required"),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { username: "", password: "" } });

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      const user = await login(values.username, values.password);
      if (user.role === "cb_admin") navigate("/cb");
      else if (user.role === "bank_staff") navigate(`/b/${user.bank_code}`);
      else navigate(`/b/${user.bank_code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Banknote className="h-6 w-6" />
          </div>
          <CardTitle>Sworna CBDC</CardTitle>
          <CardDescription>Sign in to the banking portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="cbadmin · banka_admin · alice" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                Sign in
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo accounts: cbadmin / banka_admin / bankb_admin / alice · password sworna-cb or sworna-bank or sworna-pass
          </p>
        </CardContent>
      </Card>
    </div>
  );
}