"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { wellCreateSchema, type WellCreateFormData } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

interface WellFormProps {
  onSubmit: (data: WellCreateFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<WellCreateFormData>;
}

export function WellForm({ onSubmit, isLoading, defaultValues }: WellFormProps) {
  const form = useForm<WellCreateFormData>({
    resolver: zodResolver(wellCreateSchema),
    defaultValues: {
      well_name: "",
      well_type: "oil",
      well_status: "active",
      orientation: "vertical",
      country: "US",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Identification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identification</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="well_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Well Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SMITH 1-24H" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="api_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Number</FormLabel>
                  <FormControl>
                    <Input placeholder="42-123-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="operator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operator</FormLabel>
                  <FormControl>
                    <Input placeholder="Operator name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Classification</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="well_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Well Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="oil">Oil</SelectItem>
                      <SelectItem value="gas">Gas</SelectItem>
                      <SelectItem value="oil_gas">Oil &amp; Gas</SelectItem>
                      <SelectItem value="injection">Injection</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="well_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="shut_in">Shut In</SelectItem>
                      <SelectItem value="plugged">Plugged</SelectItem>
                      <SelectItem value="drilling">Drilling</SelectItem>
                      <SelectItem value="completing">Completing</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orientation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orientation</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                      <SelectItem value="deviated">Deviated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField control={form.control} name="basin" render={({ field }) => (
              <FormItem>
                <FormLabel>Basin</FormLabel>
                <FormControl><Input placeholder="e.g. Permian" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="field_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Field</FormLabel>
                <FormControl><Input placeholder="Field name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="formation" render={({ field }) => (
              <FormItem>
                <FormLabel>Formation</FormLabel>
                <FormControl><Input placeholder="e.g. Wolfcamp A" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="county" render={({ field }) => (
              <FormItem>
                <FormLabel>County</FormLabel>
                <FormControl><Input placeholder="County" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="state_province" render={({ field }) => (
              <FormItem>
                <FormLabel>State/Province</FormLabel>
                <FormControl><Input placeholder="e.g. Texas" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="latitude" render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl><Input type="number" step="any" placeholder="31.9686" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="longitude" render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl><Input type="number" step="any" placeholder="-102.0779" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Dates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField control={form.control} name="spud_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Spud Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="completion_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Completion Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="first_prod_date" render={({ field }) => (
              <FormItem>
                <FormLabel>First Production Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Well Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Well Parameters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField control={form.control} name="total_depth" render={({ field }) => (
              <FormItem>
                <FormLabel>Total Depth (ft)</FormLabel>
                <FormControl><Input type="number" step="any" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="lateral_length" render={({ field }) => (
              <FormItem>
                <FormLabel>Lateral Length (ft)</FormLabel>
                <FormControl><Input type="number" step="any" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="num_stages" render={({ field }) => (
              <FormItem>
                <FormLabel>Frac Stages</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Reservoir Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reservoir Properties</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField control={form.control} name="initial_pressure" render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Pressure (psi)</FormLabel>
                <FormControl><Input type="number" step="any" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="reservoir_temp" render={({ field }) => (
              <FormItem>
                <FormLabel>Reservoir Temp (F)</FormLabel>
                <FormControl><Input type="number" step="any" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="porosity" render={({ field }) => (
              <FormItem>
                <FormLabel>Porosity (fraction)</FormLabel>
                <FormControl><Input type="number" step="0.001" placeholder="0.08" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="water_saturation" render={({ field }) => (
              <FormItem>
                <FormLabel>Water Saturation (fraction)</FormLabel>
                <FormControl><Input type="number" step="0.001" placeholder="0.30" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="net_pay" render={({ field }) => (
              <FormItem>
                <FormLabel>Net Pay (ft)</FormLabel>
                <FormControl><Input type="number" step="any" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="permeability" render={({ field }) => (
              <FormItem>
                <FormLabel>Permeability (md)</FormLabel>
                <FormControl><Input type="number" step="any" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues ? "Update Well" : "Create Well"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
