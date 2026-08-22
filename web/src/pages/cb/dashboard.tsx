import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Coins, Landmark, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type Overview } from "@/lib/api";
import { toast } from "sonner";

const schema = z.object({
  to_account: z.string().min(1, "account required"),
  amount: z.string().min(1, "amount required"),
  reference: z.string(),
});

export function CBDashboard() {
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [accounts, setAccounts] = React.useState<{ account_number: string; full_name: string }[]>([]);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { to_account: "", amount: "", reference: "" } });

  async function load() {
    try {
      const [ov, acc] = await Promise.all([api.overview(), api.accounts()]);
      setOverview(ov);
      setAccounts(acc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "load failed");
    }
  }
  React.useEffect(() => {
    load();
  }, []);

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      await api.issue(values);
      toast.success(`Issued ${values.amount} SWR to ${values.to_account}`);
      form.reset({ to_account: "", amount: "", reference: "" });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "issue failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total supply</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">रू {overview ? Number(overview.total_supply).toFixed(2) : "…"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banks</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overview?.circulation.length ?? "…"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refresh</CardTitle>
            <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={load}>
              Refresh data
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue SWR</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="to_account" render={({ field }) => (
                  <FormItem>
                    <FormLabel>To account</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.account_number} value={a.account_number}>
                              {a.account_number} — {a.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (SWR)</FormLabel>
                    <FormControl>
                      <Input placeholder="100.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="optional" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full">Issue</Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Circulation per bank</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview?.circulation.map((row) => (
              <div key={row.bank_code} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">
                    {row.bank_name} <span className="text-muted-foreground">({row.bank_code})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.account_count} accounts · {row.status}
                  </p>
                </div>
                <p className="font-semibold">रू {Number(row.total).toFixed(2)}</p>
              </div>
            ))}
            {!overview?.circulation.length && <p className="text-sm text-muted-foreground">No banks yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}