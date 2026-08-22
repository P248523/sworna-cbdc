import * as React from "react";
import { Blocks, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type LedgerStatus, type TxLog } from "@/lib/api";
import { toast } from "sonner";

export function CBLedger() {
  const [ledger, setLedger] = React.useState<LedgerStatus | null>(null);
  const [txns, setTxns] = React.useState<TxLog[]>([]);

  async function load() {
    try {
      const [lg, tr] = await Promise.all([api.ledger(), api.transactions()]);
      setLedger(lg);
      setTxns(tr);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "load failed");
    }
  }
  React.useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Blocks className="h-4 w-4 text-muted-foreground" /> Ledger monitor
          </CardTitle>
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-sm text-muted-foreground">
            channel <span className="font-mono">{ledger?.channel ?? "…"}</span> · height{" "}
            <span className="font-semibold">{ledger?.height ?? "…"}</span>
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Block</TableHead>
                <TableHead>Tx count</TableHead>
                <TableHead>Tx ids</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger?.blocks.slice().reverse().map((b) => (
                <TableRow key={b.number}>
                  <TableCell className="font-mono text-xs">{b.number}</TableCell>
                  <TableCell>{b.tx_count}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {b.txids.map((t) => t.slice(0, 10) + "…").join(", ") || "config"}
                  </TableCell>
                </TableRow>
              ))}
              {!ledger && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">loading…</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListOrdered className="h-4 w-4 text-muted-foreground" /> Recent transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.map((t) => (
                <TableRow key={t.txid}>
                  <TableCell>
                    <Badge variant={t.tx_type === "issue" ? "default" : t.tx_type === "redeem" ? "secondary" : "outline"}>
                      {t.tx_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.from_account || "CB"}</TableCell>
                  <TableCell className="font-mono text-xs">{t.to_account || "CB"}</TableCell>
                  <TableCell>{Number(t.amount).toFixed(2)} SWR</TableCell>
                  <TableCell className="text-xs">{t.reference}</TableCell>
                </TableRow>
              ))}
              {!txns.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No transactions yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}