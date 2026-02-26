"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUser } from "@/lib/auth";
import { usePreferences, useUpdateProfile, useUpdatePreferences } from "@/hooks/use-settings";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const user = getUser();
  const { data: prefsData } = usePreferences();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();

  const prefs = prefsData?.data;

  const [name, setName] = useState(user?.name || "");
  const [unitSystem, setUnitSystem] = useState("field");
  const [dcaModel, setDcaModel] = useState("modified_hyperbolic");
  const [economicLimit, setEconomicLimit] = useState("5");

  // Sync preferences from server when loaded
  useEffect(() => {
    if (prefs) {
      if (prefs.unit_system) setUnitSystem(prefs.unit_system);
      if (prefs.default_dca_model) setDcaModel(prefs.default_dca_model);
      if (prefs.default_economic_limit != null)
        setEconomicLimit(String(prefs.default_economic_limit));
    }
  }, [prefs]);

  const handleSaveProfile = () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateProfile.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast.success("Profile updated");
          // Update local storage
          if (user) {
            const updated = { ...user, name: name.trim() };
            localStorage.setItem("petroflow_user", JSON.stringify(updated));
          }
        },
        onError: () => toast.error("Failed to update profile"),
      },
    );
  };

  const handleSavePreferences = () => {
    const limit = parseFloat(economicLimit);
    updatePreferences.mutate(
      {
        unit_system: unitSystem,
        default_dca_model: dcaModel,
        default_economic_limit: isNaN(limit) ? undefined : limit,
      },
      {
        onSuccess: () => toast.success("Preferences saved"),
        onError: () => toast.error("Failed to save preferences"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} readOnly className="opacity-60" />
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSaveProfile}
            disabled={updateProfile.isPending}
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {updateProfile.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>Application display and analysis defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Unit System</Label>
              <Select value={unitSystem} onValueChange={setUnitSystem}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="field">Field (Imperial)</SelectItem>
                  <SelectItem value="metric">Metric (SI)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Affects rate units (bbl/d vs m3/d) and depth units (ft vs m)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default Decline Model</Label>
              <Select value={dcaModel} onValueChange={setDcaModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exponential">Exponential</SelectItem>
                  <SelectItem value="hyperbolic">Hyperbolic</SelectItem>
                  <SelectItem value="harmonic">Harmonic</SelectItem>
                  <SelectItem value="modified_hyperbolic">Modified Hyperbolic</SelectItem>
                  <SelectItem value="sedm">Stretched Exponential (SEDM)</SelectItem>
                  <SelectItem value="duong">Duong</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pre-selected model for new DCA analyses
              </p>
            </div>
          </div>

          <Separator />

          <div className="max-w-xs space-y-2">
            <Label htmlFor="economic-limit">Economic Limit (bbl/d)</Label>
            <Input
              id="economic-limit"
              type="number"
              step="0.5"
              min="0"
              value={economicLimit}
              onChange={(e) => setEconomicLimit(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Default minimum rate threshold for DCA forecast termination
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleSavePreferences}
            disabled={updatePreferences.isPending}
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {updatePreferences.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>

      {/* Team Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team</CardTitle>
          <CardDescription>Team management (coming soon)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Team management features will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
