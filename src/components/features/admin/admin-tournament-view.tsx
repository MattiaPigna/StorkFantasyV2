"use client";

import { useEffect, useState } from "react";
import { Trophy, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTournamentRules, updateTournamentRules } from "@/lib/db/settings";
import { useToast } from "@/hooks/use-toast";

export function AdminTournamentView() {
  const [contentHtml, setContentHtml] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getTournamentRules().then((r) => {
      if (r) { setContentHtml(r.content_html ?? ""); setPdfUrl(r.pdf_url ?? ""); }
    }).finally(() => setIsLoading(false));
  }, []);

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateTournamentRules({ content_html: contentHtml || null, pdf_url: pdfUrl || null });
      toast({ title: "Regolamento salvato!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-stork-orange" />
          <h1 className="text-2xl font-bold">Regolamento Torneo</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />}
          Salva
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Link PDF</CardTitle></CardHeader>
            <CardContent>
              <Input placeholder="https://..." value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1.5">URL diretto al file PDF del regolamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contenuto HTML</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                placeholder="Inserisci il contenuto HTML del regolamento..."
                rows={20}
                className="w-full rounded-lg border border-stork-dark-border bg-muted px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stork-orange/50 resize-y"
              />
            </CardContent>
          </Card>

          {contentHtml && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Anteprima</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-sm max-w-none border border-stork-dark-border rounded-lg p-4" dangerouslySetInnerHTML={{ __html: contentHtml }} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
