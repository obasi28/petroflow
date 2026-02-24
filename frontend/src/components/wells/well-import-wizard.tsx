"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Check, FileSpreadsheet, Loader2, Upload } from "lucide-react";

type Step = "upload" | "mapping" | "preview";

const EXPECTED_COLUMNS = [
  "well_name",
  "api_number",
  "uwi",
  "project_id",
  "operator",
  "well_type",
  "well_status",
  "orientation",
  "basin",
  "field_name",
  "formation",
  "state_province",
  "county",
  "country",
  "latitude",
  "longitude",
  "spud_date",
  "completion_date",
  "first_prod_date",
  "total_depth",
  "lateral_length",
  "num_stages",
  "notes",
];

interface WellImportWizardProps {
  onComplete: () => void;
}

export function WellImportWizard({ onComplete }: WellImportWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Array<Array<string | number | null>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState<{
    rows_detected: number;
    created_count: number;
    updated_count: number;
    skipped_count: number;
    errors?: Array<{ row: number; message: string }>;
  } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) {
      return;
    }
    setFile(selectedFile);
    void parseFilePreview(selectedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  function renderPreviewCell(cell: unknown): string | number {
    if (cell === null || cell === undefined || cell === "") {
      return "--";
    }
    if (typeof cell === "string" || typeof cell === "number") {
      return cell;
    }
    return String(cell);
  }

  async function parseFilePreview(selectedFile: File) {
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await api.upload<{
        columns: string[];
        preview: Array<Array<string | number | null>>;
        suggested_mapping: Record<string, string>;
      }>("/imports/wells/upload", formData);

      if (result.status !== "success" || !result.data) {
        toast.error(result.errors?.[0]?.message || "Failed to parse file");
        return;
      }

      setHeaders(result.data.columns || []);
      setPreview(result.data.preview || []);
      setMapping(result.data.suggested_mapping || {});
      setStep("mapping");
    } catch {
      toast.error("Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImport() {
    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("execute", "true");
      formData.append("column_mapping", JSON.stringify(mapping));

      const result = await api.upload<{
        rows_detected: number;
        created_count: number;
        updated_count: number;
        skipped_count: number;
        errors?: Array<{ row: number; message: string }>;
      }>("/imports/wells/upload", formData);

      if (result.status !== "success" || !result.data) {
        toast.error(result.errors?.[0]?.message || "Well import failed");
        return;
      }

      setLastImportSummary(result.data);
      const importedCount = result.data.created_count + result.data.updated_count;
      if (importedCount <= 0) {
        toast.error(
          `Import finished with no new wells. ${result.data.skipped_count} skipped. Check column mapping and row errors.`,
        );
        return;
      }

      toast.success(`Import complete: ${result.data.created_count} created, ${result.data.updated_count} updated.`);
      await queryClient.invalidateQueries({ queryKey: ["wells"] });
      onComplete();
    } catch {
      toast.error("Well import failed");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {(["upload", "mapping", "preview"] as Step[]).map((currentStep, index) => (
          <div key={currentStep} className="flex items-center gap-2">
            <Badge variant={step === currentStep ? "default" : "outline"} className="capitalize">
              {index + 1}. {currentStep}
            </Badge>
            {index < 2 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {lastImportSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Last Import Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <ResultMetric label="Rows Detected" value={String(lastImportSummary.rows_detected)} />
              <ResultMetric label="Created" value={String(lastImportSummary.created_count)} />
              <ResultMetric label="Updated" value={String(lastImportSummary.updated_count)} />
              <ResultMetric label="Skipped" value={String(lastImportSummary.skipped_count)} />
            </div>
            {lastImportSummary.errors && lastImportSummary.errors.length > 0 && (
              <div className="space-y-1 rounded border border-border/60 p-2">
                <p className="font-medium text-amber-400">Row Errors</p>
                {lastImportSummary.errors.slice(0, 5).map((error, index) => (
                  <p key={`${error.row}-${index}`} className="font-mono text-[11px] text-muted-foreground">
                    row {error.row}: {error.message}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between rounded border border-dashed px-3 py-2 text-xs">
        <span className="text-muted-foreground">Use template CSV for quickest mapping and clean upsert.</span>
        <Button asChild size="sm" variant="outline" className="h-7">
          <Link href="/templates/wells-import-template.csv">Download Template</Link>
        </Button>
      </div>

      {step === "upload" && (
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              {isParsing ? (
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {isParsing
                  ? "Analyzing file..."
                  : isDragActive
                    ? "Drop the file here"
                    : "Drag and drop well CSV/Excel, or click to browse"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" />
              Well Column Mapping
              <span className="text-xs font-normal text-muted-foreground">({file?.name})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {EXPECTED_COLUMNS.map((col) => (
                <div key={col} className="flex items-center gap-2">
                  <span className="w-36 text-xs font-mono text-muted-foreground">{col}</span>
                  <Select
                    value={mapping[col] || "skip"}
                    onValueChange={(value) =>
                      setMapping((prev) => ({
                        ...prev,
                        [col]: value === "skip" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">-- skip --</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={() => setStep("preview")}>
                Next: Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview (first 10 rows)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHead key={header} className="whitespace-nowrap text-xs">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((value, cellIndex) => (
                        <TableCell key={cellIndex} className="whitespace-nowrap text-xs font-mono">
                          {renderPreviewCell(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Import Wells (API/UWI Upsert)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 px-2 py-1.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono font-medium">{value}</p>
    </div>
  );
}
