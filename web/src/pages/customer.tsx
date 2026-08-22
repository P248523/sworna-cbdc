import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type Balance, type StatementItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const schema = z.object({
  to_account: z.string().min(1, "recipient account required"),
  amount: z.string().min(1, "amount required"),
  reference: z.string(),
});

export function CustomerView() {
  const { user } = useAuth();
  const account = user?.account_number ?? "";
  const [balance, setBalance] = React.useState<Balance | null>(null);
  const [statements, setStatements] = React.useState<StatementItem[]>([]);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { to_account: "", amount: "", reference: "" } });

  async function load() {
    if (!account) return;
    try {
      const [b, s] = await Promise.all([api.balance(account), api.statements(account)]);
      setBalance(b);
      setStatements(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "load failed");
    }
  }
  React.useEffect(() => {
    load();
  }, [account]);

  async function send(values: z.infer<typeof schema>) {
    try {
      await api.transfer({ from_account: account, ...values });
      toast.success(`Sent ${values.amount} SWR → ${values.to_account}`);
      form.reset({ to_account: "", amount: "", reference: "" });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "transfer failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My account</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div>
            <p className="font-mono text-sm text-muted-foreground">{balance?.account_number ?? account}</p>
            <p className="text-4xl font-bold">रू {balance ? Number(balance.balance).toFixed(2) : "…"}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{balance?.full_name}</p>
            <p>Bank {balance?.bank_code}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Send money</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(send)} className="space-y-4">
              <FormField control={form.control} name="to_account" render={({ field }) => (
                <FormItem>
                  <FormLabel>To account number</FormLabel>
                  <FormControl>
                    <Input placeholder="SWR-002-00000001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (SWR)</FormLabel>
                    <FormControl><Input placeholder="10.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl><Input placeholder="optional" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <Button type="submit"><Send className="mr-1 h-4 w-4" /> Send</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Statements</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tx</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>From / To</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.slice(0, 25).map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{s.txid.slice(0, 12)}…</TableCell>
                  <TableCell>{(s.amount / 100).toFixed(2)} SWR</TableCell>
                  <TableCell className="text-xs">
                    {s.sender || "CB"} → {s.recipient || "CB"}
                  </TableCell>
                  <TableCell className="text-xs">{s.reference}</TableCell>
                  <TableCell className="text-xs">{s.status}</TableCell>
                </TableRow>
              ))}
              {!statements.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No transactions yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}