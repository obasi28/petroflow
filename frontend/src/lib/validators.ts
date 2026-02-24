import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const optionalString = () => z.preprocess(emptyToUndefined, z.string().optional());
const optionalDateString = () => z.preprocess(emptyToUndefined, z.string().optional());
const optionalUuidString = () =>
  z.preprocess(emptyToUndefined, z.string().uuid().optional());
const optionalNumber = <T extends z.ZodNumber>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const wellCreateSchema = z.object({
  well_name: z.string().min(1, "Well name is required").max(255),
  api_number: optionalString(),
  uwi: optionalString(),
  project_id: optionalUuidString(),
  latitude: optionalNumber(z.coerce.number().min(-90).max(90)),
  longitude: optionalNumber(z.coerce.number().min(-180).max(180)),
  county: optionalString(),
  state_province: optionalString(),
  country: z.string().default("US"),
  basin: optionalString(),
  field_name: optionalString(),
  well_type: z.enum(["oil", "gas", "oil_gas", "injection"]).default("oil"),
  well_status: z.enum(["active", "shut_in", "plugged", "drilling", "completing"]).default("active"),
  orientation: z.enum(["vertical", "horizontal", "deviated"]).default("vertical"),
  formation: optionalString(),
  operator: optionalString(),
  spud_date: optionalDateString(),
  completion_date: optionalDateString(),
  first_prod_date: optionalDateString(),
  total_depth: optionalNumber(z.coerce.number().positive()),
  lateral_length: optionalNumber(z.coerce.number().positive()),
  perf_top: optionalNumber(z.coerce.number().positive()),
  perf_bottom: optionalNumber(z.coerce.number().positive()),
  num_stages: optionalNumber(z.coerce.number().int().positive()),
  initial_pressure: optionalNumber(z.coerce.number().positive()),
  reservoir_temp: optionalNumber(z.coerce.number().positive()),
  porosity: optionalNumber(z.coerce.number().min(0).max(1)),
  water_saturation: optionalNumber(z.coerce.number().min(0).max(1)),
  net_pay: optionalNumber(z.coerce.number().positive()),
  permeability: optionalNumber(z.coerce.number().positive()),
  notes: optionalString(),
  tags: z.array(z.string()).optional(),
});

export const dcaCreateSchema = z.object({
  name: z.string().min(1, "Analysis name is required").max(255),
  description: z.string().optional(),
  model_type: z.enum([
    "exponential",
    "hyperbolic",
    "harmonic",
    "modified_hyperbolic",
    "sedm",
    "duong",
  ]),
  fluid_type: z.enum(["oil", "gas", "water", "boe"]).default("oil"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  economic_limit: z.coerce.number().positive().default(5.0),
  forecast_months: z.coerce.number().int().min(1).max(600).default(360),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type WellCreateFormData = z.infer<typeof wellCreateSchema>;
export type DCACreateFormData = z.infer<typeof dcaCreateSchema>;
