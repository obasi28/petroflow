import { z } from "zod";

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
  api_number: z.string().optional(),
  uwi: z.string().optional(),
  project_id: z.string().uuid().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  county: z.string().optional(),
  state_province: z.string().optional(),
  country: z.string().default("US"),
  basin: z.string().optional(),
  field_name: z.string().optional(),
  well_type: z.enum(["oil", "gas", "oil_gas", "injection"]).default("oil"),
  well_status: z.enum(["active", "shut_in", "plugged", "drilling", "completing"]).default("active"),
  orientation: z.enum(["vertical", "horizontal", "deviated"]).default("vertical"),
  formation: z.string().optional(),
  operator: z.string().optional(),
  spud_date: z.string().optional(),
  completion_date: z.string().optional(),
  first_prod_date: z.string().optional(),
  total_depth: z.coerce.number().positive().optional(),
  lateral_length: z.coerce.number().positive().optional(),
  perf_top: z.coerce.number().positive().optional(),
  perf_bottom: z.coerce.number().positive().optional(),
  num_stages: z.coerce.number().int().positive().optional(),
  initial_pressure: z.coerce.number().positive().optional(),
  reservoir_temp: z.coerce.number().positive().optional(),
  porosity: z.coerce.number().min(0).max(1).optional(),
  water_saturation: z.coerce.number().min(0).max(1).optional(),
  net_pay: z.coerce.number().positive().optional(),
  permeability: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
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
