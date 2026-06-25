import { createClient } from "@/lib/supabase/server";
import { aiConfigured } from "@/lib/ai";
import { uploadInvoice, setInvoiceStatus } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Invoice = {
  id: string;
  file_path: string;
  vendor: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  currency: string | null;
  net_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  status: "pending" | "approved" | "rejected";
  extracted_mock: boolean;
  reviewed_at: string | null;
};

// The liquidation states, with Slovenian labels + a badge colour each.
const STATUS: Record<
  Invoice["status"],
  { label: string; variant: "secondary" | "default" | "destructive" }
> = {
  pending: { label: "Čaka na likvidacijo", variant: "secondary" },
  approved: { label: "Likvidiran", variant: "default" },
  rejected: { label: "Zavrnjen", variant: "destructive" },
};

function money(v: number | null, currency: string | null): string {
  if (v === null || v === undefined) return "—";
  const n = v.toLocaleString("sl-SI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${n} ${currency}` : n;
}

// AI OCR + liquidation. Upload an invoice → the model reads it (modules/invoice_ocr/
// lib/ocr.ts) → a row in the prefixed, RLS-scoped table → approve/reject → export CSV.
export async function InvoiceOcrModule() {
  const supabase = await createClient();
  // RLS scopes invoice_ocr_invoices to the signed-in user.
  const { data } = await supabase
    .from("invoice_ocr_invoices")
    .select(
      "id, file_path, vendor, invoice_number, issue_date, due_date, currency, net_amount, tax_amount, total_amount, status, extracted_mock, reviewed_at",
    )
    .order("created_at", { ascending: false });
  const invoices = (data ?? []) as Invoice[];

  // One signed URL per stored file (the bucket is private) for the "Odpri" link.
  const urlByPath = new Map<string, string>();
  const paths = invoices.map((i) => i.file_path).filter(Boolean);
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("invoice_ocr")
      .createSignedUrls(paths, 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Likvidacija računov</h1>
          {aiConfigured() ? null : <Badge variant="secondary">mock način</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Naloži račun (slika ali PDF). AI prebere podatke (OCR), ti pa jih potrdiš ali
          zavrneš za plačilo — in po potrebi izvoziš v CSV.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Naloži račun</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={uploadInvoice} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="file">Datoteka računa (PNG, JPG ali PDF)</Label>
              <input
                id="file"
                name="file"
                type="file"
                required
                accept="image/png,image/jpeg,application/pdf"
                className="block w-full max-w-sm rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <SubmitButton pendingText="Berem…">Naloži in preberi</SubmitButton>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Največ 8 MB. Original se shrani v tvoj zasebni prostor (Supabase Storage).
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Računi za likvidacijo
          </h2>
          {invoices.length > 0 ? (
            <a
              href="/api/invoice_ocr/export"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Izvozi CSV
            </a>
          ) : null}
        </div>

        {invoices.length > 0 ? (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dobavitelj</TableHead>
                  <TableHead>Št. računa</TableHead>
                  <TableHead>Izdan</TableHead>
                  <TableHead>Zapadlost</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">DDV</TableHead>
                  <TableHead className="text-right">Skupaj</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Likvidacija</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const st = STATUS[inv.status] ?? STATUS.pending;
                  const url = urlByPath.get(inv.file_path);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        {inv.vendor ?? "—"}
                        {inv.extracted_mock ? (
                          <Badge variant="secondary" className="ml-2">
                            mock
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{inv.invoice_number ?? "—"}</TableCell>
                      <TableCell>{inv.issue_date ?? "—"}</TableCell>
                      <TableCell>{inv.due_date ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(inv.net_amount, inv.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(inv.tax_amount, inv.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {money(inv.total_amount, inv.currency)}
                      </TableCell>
                      <TableCell>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            Odpri
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <form action={setInvoiceStatus}>
                              <input type="hidden" name="id" value={inv.id} />
                              <input type="hidden" name="status" value="approved" />
                              <SubmitButton size="sm" pendingText="…">
                                Potrdi
                              </SubmitButton>
                            </form>
                            <form action={setInvoiceStatus}>
                              <input type="hidden" name="id" value={inv.id} />
                              <input type="hidden" name="status" value="rejected" />
                              <SubmitButton size="sm" variant="outline" pendingText="…">
                                Zavrni
                              </SubmitButton>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">pregledano</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Še ni računov. Naloži prvega zgoraj.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
