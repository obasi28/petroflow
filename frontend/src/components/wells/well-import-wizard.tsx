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
import { ArrowRight, Check, CheckCircle2, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";

type Step = "upload" | "mapping" | "preview" | "results";

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

interface ImportSummary {
  rows_detected: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  errors?: Array<{ row: number; message: string }>;
}

interface WellImportWizardProps {
  onComplete: () => void;
  projectId?: string;
}

export function WellImportWizard({ onComplete, projectId }: WellImportWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Array<Array<string | number | null>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState<ImportSummary | null>(null);

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
      if (projectId) {
        formData.append("project_id", projectId);
      }

      const result = await api.upload<ImportSummary>("/imports/wells/upload", formData);

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
        setStep("results");
        return;
      }

      toast.success(`Import complete: ${result.data.created_count} created, ${result.data.updated_count} updated.`);

      // Use refetchQueries instead of invalidateQueries — this awaits the
      // network response so the cache has fresh data before we navigate.
      await queryClient.refetchQueries({ queryKey: ["wells"] });
      if (projectId) {
        await queryClient.invalidateQueries({ queryKey: ["projects"] });
      }

      setStep("results");
    } catch {
      toast.error("Well import failed");
    } finally {
      setIsImporting(false);
    }
  }

  const stepLabels: Step[] = ["upload", "mapping", "preview", "results"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {stepLabels.map((currentStep, index) => (
          <div key={currentStep} className="flex items-center gap-2">
            <Badge variant={step === currentStep ? "default" : "outline"} className="capitalize">
              {index + 1}. {currentStep}
            </Badge>
            {index < stepLabels.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        ))}
      </div>

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

      {step === "results" && lastImportSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {(lastImportSummary.created_count + lastImportSummary.updated_count) > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ResultMetric label="Rows Detected" value={String(lastImportSummary.rows_detected)} />
              <ResultMetric label="Created" value={String(lastImportSummary.created_count)} variant="success" />
              <ResultMetric label="Updated" value={String(lastImportSummary.updated_count)} />
              <ResultMetric label="Skipped" value={String(lastImportSummary.skipped_count)} variant={lastImportSummary.skipped_count > 0 ? "warning" : "default"} />
            </div>
            {lastImportSummary.errors && lastImportSummary.errors.length > 0 && (
              <div className="space-y-1 rounded border border-border/60 p-3">
                <p className="text-xs font-medium text-amber-400">Row Errors ({lastImportSummary.errors.length})</p>
                {lastImportSummary.errors.slice(0, 10).map((error, index) => (
                  <p key={`${error.row}-${index}`} className="font-mono text-[11px] text-muted-foreground">
                    Row {error.row}: {error.message}
                  </p>
                ))}
                {lastImportSummary.errors.length > 10 && (
                  <p className="text-[11px] text-muted-foreground">
                    ... and {lastImportSummary.errors.length - 10} more
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setLastImportSummary(null);
                }}
              >
                Import More
              </Button>
              <Button onClick={onComplete}>
                View Wells
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultMetric({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "success" | "warning";
}) {
  const borderClass =
    variant === "success"
      ? "border-green-500/30"
      : variant === "warning"
        ? "border-amber-500/30"
        : "border-border/60";
  return (
    <div className={`rounded border ${borderClass} px-2 py-1.5`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium">{value}</p>
    </div>
  );
}
