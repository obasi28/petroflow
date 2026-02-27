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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  AlertTriangle,
  Download,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useBulkProductionImport } from "@/hooks/use-production";
import { toast } from "sonner";
import type { BulkProductionImportResult } from "@/types/production";

type Step = "upload" | "mapping" | "preview" | "results";

const EXPECTED_COLUMNS = [
  { key: "well_identifier", label: "Well Identifier", description: "Well name, API #, or UWI", required: true },
  { key: "production_date", label: "Production Date", description: "Date of production record", required: true },
  { key: "oil_rate", label: "Oil Rate", description: "Oil production rate (bbl/d)", required: false },
  { key: "gas_rate", label: "Gas Rate", description: "Gas production rate (Mcf/d)", required: false },
  { key: "water_rate", label: "Water Rate", description: "Water production rate (bbl/d)", required: false },
];

interface BulkImportWizardProps {
  projectId?: string;
  onComplete: () => void;
}

export function BulkImportWizard({ projectId, onComplete }: BulkImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Array<Array<string | number | null>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importResult, setImportResult] = useState<BulkProductionImportResult | null>(null);

  const bulkImport = useBulkProductionImport();

  const parseFilePreview = useCallback(async (selectedFile: File) => {
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (projectId) formData.append("project_id", projectId);

      const response = await api.upload<{
        columns: string[];
        preview: Array<Array<string | number | null>>;
        suggested_mapping: Record<string, string>;
      }>("/imports/production/bulk", formData);

      if (response.data) {
        setHeaders(response.data.columns);
        setPreview(response.data.preview);
        // Build initial mapping from suggestions
        const initial: Record<string, string> = {};
        const sm = response.data.suggested_mapping;
        if (sm.well_identifier_column) initial.well_identifier = sm.well_identifier_column;
        if (sm.date_column) initial.production_date = sm.date_column;
        if (sm.oil_column) initial.oil_rate = sm.oil_column;
        if (sm.gas_column) initial.gas_rate = sm.gas_column;
        if (sm.water_column) initial.water_rate = sm.water_column;
        setMapping(initial);
        setStep("mapping");
      } else {
        toast.error("Failed to parse file");
      }
    } catch {
      toast.error("Error parsing file");
    } finally {
      setIsParsing(false);
    }
  }, [projectId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileContent(selectedFile);
      void parseFilePreview(selectedFile);
    }
  }, [parseFilePreview]);

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
    if (cell === null || cell === undefined || cell === "") return "--";
    if (typeof cell === "number") return cell;
    return String(cell);
  }

  const canProceedToPreview =
    mapping.well_identifier && mapping.production_date;

  async function handleImport() {
    if (!fileContent) return;

    const formData = new FormData();
    formData.append("file", fileContent);
    formData.append("execute", "true");
    formData.append("replace_existing", String(replaceExisting));
    if (projectId) formData.append("project_id", projectId);

    // Build backend-compatible column mapping
    const backendMapping: Record<string, string> = {};
    if (mapping.well_identifier) backendMapping.well_identifier_column = mapping.well_identifier;
    if (mapping.production_date) backendMapping.date_column = mapping.production_date;
    if (mapping.oil_rate) backendMapping.oil_column = mapping.oil_rate;
    if (mapping.gas_rate) backendMapping.gas_column = mapping.gas_rate;
    if (mapping.water_rate) backendMapping.water_column = mapping.water_rate;
    formData.append("column_mapping", JSON.stringify(backendMapping));

    bulkImport.mutate(formData, {
      onSuccess: (response) => {
        if (response.data) {
          setImportResult(response.data);
          setStep("results");
          toast.success(
            `Imported ${response.data.total_records_imported} records for ${response.data.matched_wells} wells`,
          );
        } else {
          toast.error(response.errors?.[0]?.message || "Import failed");
        }
      },
      onError: () => toast.error("Bulk production import failed"),
    });
  }

  // Count unique well identifiers in preview
  const wellIdentifierCol = mapping.well_identifier;
  const wellColIndex = wellIdentifierCol ? headers.indexOf(wellIdentifierCol) : -1;
  const uniqueWells = new Set(
    wellColIndex >= 0
      ? preview.map((row) => String(row[wellColIndex] ?? "")).filter(Boolean)
      : [],
  );

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {(["upload", "mapping", "preview", "results"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            <Badge variant={step === s ? "default" : "outline"} className="text-xs capitalize">
              {i + 1}. {s}
            </Badge>
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upload Multi-Well Production File</CardTitle>
              <a
                href="/templates/production-import-template.csv"
                download
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Download className="h-3 w-3" />
                Download template
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              {isParsing ? (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : file ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-primary" />
                  <p className="mt-3 text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Drop a CSV or Excel file, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    File must include a well identifier column (name, API, or UWI) plus production date and rates
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your file columns to the expected production fields.
            </p>
            <div className="grid gap-3">
              {EXPECTED_COLUMNS.map((col) => (
                <div key={col.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      {col.label}
                      {col.required && <span className="text-destructive ml-1">*</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{col.description}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={mapping[col.key] || "_none"}
                    onValueChange={(value) =>
                      setMapping((prev) => ({
                        ...prev,
                        [col.key]: value === "_none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">-- Skip --</SelectItem>
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
            <div className="flex justify-between pt-4">
              <Button variant="outline" size="sm" onClick={() => setStep("upload")}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Button>
              <Button size="sm" disabled={!canProceedToPreview} onClick={() => setStep("preview")}>
                Preview
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{preview.length}</div>
                <div className="text-xs text-muted-foreground">Total rows</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{uniqueWells.size}</div>
                <div className="text-xs text-muted-foreground">Unique wells</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{headers.length}</div>
                <div className="text-xs text-muted-foreground">Columns</div>
              </CardContent>
            </Card>
          </div>

          {/* Preview table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Data Preview (first {Math.min(preview.length, 10)} rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h) => (
                        <TableHead key={h} className="whitespace-nowrap text-xs">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-xs">
                            {renderPreviewCell(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="replace"
                  checked={replaceExisting}
                  onCheckedChange={(checked) => setReplaceExisting(!!checked)}
                />
                <label htmlFor="replace" className="text-sm cursor-pointer">
                  Replace existing production data for matched wells
                </label>
              </div>
              <p className="mt-1 ml-6 text-xs text-muted-foreground">
                If checked, existing production records will be deleted before importing new ones.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setStep("mapping")}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
            <Button size="sm" onClick={handleImport} disabled={bulkImport.isPending}>
              {bulkImport.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Import {preview.length} Records
            </Button>
          </div>
        </div>
      )}

      {/* Step: Results */}
      {step === "results" && importResult && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.matched_wells}</div>
                <div className="text-xs text-muted-foreground">Wells matched</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.unmatched_wells}</div>
                <div className="text-xs text-muted-foreground">Wells not found</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{importResult.total_records_imported}</div>
                <div className="text-xs text-muted-foreground">Records imported</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{importResult.total_wells_detected}</div>
                <div className="text-xs text-muted-foreground">Total in file</div>
              </CardContent>
            </Card>
          </div>

          {/* Per-well breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Per-Well Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Identifier</TableHead>
                      <TableHead className="text-xs">Well Name</TableHead>
                      <TableHead className="text-xs">Records</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.per_well_summary.map((ws, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium">{ws.well_identifier}</TableCell>
                        <TableCell className="text-xs">{ws.well_name || "--"}</TableCell>
                        <TableCell className="text-xs">{ws.records_imported}</TableCell>
                        <TableCell className="text-xs">
                          {ws.status === "success" ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Success
                            </Badge>
                          ) : ws.status === "not_found" ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Not found
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              <XCircle className="mr-1 h-3 w-3" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Import Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>
                      <span className="font-medium">{err.well_identifier}:</span> {err.message}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={onComplete}>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
