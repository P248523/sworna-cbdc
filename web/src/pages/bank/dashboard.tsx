import * as React from "react";
import { UserPlus, Send } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type Account } from "@/lib/api";
import { toast } from "sonner";

const onboardSchema = z.object({
  full_name: z.string().min(1, "name required"),
  username: z.string().min(3, "username required"),
  password: z.string().min(6, "password min 6"),
  transfer_limit: z.string().min(1, "limit required"),
});

const transferSchema = z.object({
  from_account: z.string().min(1, "from required"),
  to_account: z.string().min(1, "recipient account required"),
  amount: z.string().min(1, "amount required"),
  reference: z.string(),
});

const statusBadge: Record<Account["status"], string> = {
  active: "default",
  flagged: "secondary",
  frozen: "destructive",
} as const;

export function BankDashboard({ bankCode }: { bankCode: string }) {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [balances, setBalances] = React.useState<Record<string, string>>({});
  const [onboardOpen, setOnboardOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Account | null>(null);

  const onboardForm = useForm<z.infer<typeof onboardSchema>>({ resolver: zodResolver(onboardSchema), defaultValues: { full_name: "", username: "", password: "", transfer_limit: "1000.00" } });
  const transferForm = useForm<z.infer<typeof transferSchema>>({ resolver: zodResolver(transferSchema), defaultValues: { from_account: "", to_account: "", amount: "", reference: "" } });

  async function load() {
    try {
      const accs = await api.accounts();
      setAccounts(accs);
      const bs: Record<string, string> = {};
      for (const a of accs) {
        try {
          bs[a.account_number] = (await api.balance(a.account_number)).balance;
        } catch {
          bs[a.account_number] = "—";
        }
      }
      setBalances(bs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "load failed");
    }
  }
  React.useEffect(() => {
    load();
  }, [bankCode]);

  async function onboard(values: z.infer<typeof onboardSchema>) {
    try {
      const acc = await api.onboard({ ...values, kyc_level: 1 });
      toast.success(`Onboarded ${acc.account_number}`);
      setOnboardOpen(false);
      onboardForm.reset();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "onboard failed");
    }
  }

  async function send(values: z.infer<typeof transferSchema>) {
    try {
      await api.transfer(values);
      toast.success(`Sent ${values.amount} SWR → ${values.to_account}`);
      transferForm.reset({ from_account: "", to_account: "", amount: "", reference: "" });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "transfer failed");
    }
  }

  async function toggleStatus(acc: Account) {
    const next = acc.status === "active" ? "frozen" : "active";
    try {
      await api.setAccountStatus(acc.account_number, next);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "status update failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Bank {bankCode} — accounts</h2>
          <p className="text-sm text-muted-foreground">Onboard customers, send money by account number, manage risk.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-1 h-4 w-4" /> Onboard customer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Onboard customer</DialogTitle>
                <DialogDescription>Creates an account and assigns a wallet from the bank's pool.</DialogDescription>
              </DialogHeader>
              <Form {...onboardForm}>
                <form onSubmit={onboardForm.handleSubmit(onboard)} className="space-y-4">
                  <FormField control={onboardForm.control} name="full_name" render={({ field }) => (
                    <FormItem><FormLabel>Full name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={onboardForm.control} name="username" render={({ field }) => (
                    <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={onboardForm.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={onboardForm.control} name="transfer_limit" render={({ field }) => (
                    <FormItem><FormLabel>Transfer limit (SWR)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOnboardOpen(false)}>Cancel</Button>
                    <Button type="submit">Onboard</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Send money</CardTitle></CardHeader>
        <CardContent>
          <Form {...transferForm}>
            <form onSubmit={transferForm.handleSubmit(send)} className="grid gap-4 sm:grid-cols-2">
              <FormField control={transferForm.control} name="from_account" render={({ field }) => (
                <FormItem><FormLabel>From account</FormLabel><FormControl><Input placeholder="SWR-001-00000001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={transferForm.control} name="to_account" render={({ field }) => (
                <FormItem><FormLabel>To account</FormLabel><FormControl><Input placeholder="SWR-002-00000001 (any bank)" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={transferForm.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (SWR)</FormLabel><FormControl><Input placeholder="10.00" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={transferForm.control} name="reference" render={({ field }) => (
                <FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="optional" {...field} /></FormControl></FormItem>
              )} />
              <div className="sm:col-span-2">
                <Button type="submit"><Send className="mr-1 h-4 w-4" /> Send</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Customers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.account_number} className="cursor-pointer" onClick={() => setSelected(a)}>
                  <TableCell className="font-mono text-xs">{a.account_number}</TableCell>
                  <TableCell>{a.full_name}</TableCell>
                  <TableCell>{balances[a.account_number] ? `रू ${Number(balances[a.account_number]).toFixed(2)}` : "…"}</TableCell>
                  <TableCell><Badge variant={statusBadge[a.status] as "default"}>{a.status}</Badge></TableCell>
                  <TableCell>{a.kyc_level}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => toggleStatus(a)}>
                      {a.status === "active" ? "Freeze" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected.full_name}</DialogTitle>
              <DialogDescription>{selected.account_number}</DialogDescription>
            </DialogHeader>
            <p className="text-sm">
              Balance: <span className="font-semibold">रू {balances[selected.account_number] ?? "…"}</span>
            </p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}