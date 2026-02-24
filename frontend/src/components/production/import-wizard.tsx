"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, ArrowRight, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

type Step = "upload" | "mapping" | "preview";

const EXPECTED_COLUMNS = [
  "production_date",
  "oil_rate",
  "gas_rate",
  "water_rate",
  "days_on",
  "cum_oil",
  "cum_gas",
  "cum_water",
  "gor",
  "water_cut",
  "tubing_pressure",
  "casing_pressure",
];

interface ImportWizardProps {
  wellId: string;
  onComplete: () => void;
}

export function ImportWizard({ wellId, onComplete }: ImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Array<Array<string | number | null>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      void parseFilePreview(selectedFile);
    }
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
      }>("/imports/upload", formData);

      if (result.status !== "success" || !result.data) {
        toast.error(result.errors?.[0]?.message || "Failed to parse file");
        return;
      }

      setHeaders(result.data.columns || []);
      setPreview(result.data.preview || []);

      const normalizedMapping: Record<string, string> = {};
      const suggested = result.data.suggested_mapping || {};
      const suggestedKeyMap: Record<string, string> = {
        date_column: "production_date",
        oil_column: "oil_rate",
        gas_column: "gas_rate",
        water_column: "water_rate",
      };
      for (const [suggestedKey, targetKey] of Object.entries(suggestedKeyMap)) {
        if (suggested[suggestedKey]) {
          normalizedMapping[targetKey] = suggested[suggestedKey];
        }
      }
      setMapping(normalizedMapping);
      setStep("mapping");
    } catch {
      toast.error("Failed to parse file. Please try another file.");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("well_id", wellId);
      formData.append("replace_existing", String(replaceExisting));
      formData.append("column_mapping", JSON.stringify(mapping));

      const result = await api.upload<{ records_deleted?: number }>(`/imports/upload`, formData);
      if (result.status === "success") {
        if (replaceExisting) {
          toast.success(`Production data replaced successfully (${result.data?.records_deleted ?? 0} old rows removed)`);
        } else {
          toast.success("Production data imported successfully");
        }
        onComplete();
      } else {
        toast.error(result.errors?.[0]?.message || "Import failed");
      }
    } catch {
      toast.error("Import failed. Please check your file format.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center gap-2">
        {(["upload", "mapping", "preview"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <Badge variant={step === s ? "default" : "outline"} className="capitalize">
              {i + 1}. {s}
            </Badge>
            {i < 2 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Upload Step */}
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
                    : "Drag and drop a file, or click to browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports CSV, XLS, XLSX
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping Step */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Column Mapping
              <span className="text-xs font-normal text-muted-foreground">({file?.name})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {EXPECTED_COLUMNS.map((col) => (
                <div key={col} className="flex items-center gap-2">
                  <span className="w-36 text-xs font-mono text-muted-foreground">
                    {col}
                  </span>
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
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
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

      {/* Preview Step */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview (first 5 rows)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHead key={h} className="text-xs whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell key={j} className="text-xs font-mono whitespace-nowrap">
                          {renderPreviewCell(cell)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <label className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                />
                Replace existing production history for this well
              </label>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Import Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
