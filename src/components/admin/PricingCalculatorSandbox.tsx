import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase';

interface MaterialProduct {
  id: string;
  product_name: string;
  brand: string | null;
  product_code: string | null;
  material_type: string | null;
  finish: string | null;
}

interface MaterialSystem {
  id: string;
  system_name: string;
  system_tier: string;
  recommended_use: string | null;
  default_waste_percent: number | null;
  default_for_wraps: boolean;
  display_order: number | null;
  print_material: MaterialProduct;
  laminate_material: MaterialProduct;
}

interface CoverageProfile {
  id: string;
  coverage_name: string;
  coverage_key: string;
  default_percent_of_full_wrap: number | null;
  included_areas: string[] | null;
  excluded_areas: string[] | null;
  complexity_adjustment_percent: number | null;
  requires_manual_review: boolean;
  display_order: number | null;
}

interface VehicleSqftProfile {
  id: string;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  body_style: string | null;
  full_wrap_sqft_estimate: number | null;
  side_only_sqft_estimate: number | null;
  hood_sqft_estimate: number | null;
  roof_sqft_estimate: number | null;
  rear_sqft_estimate: number | null;
  bumper_complexity: string | null;
  surface_complexity: string | null;
  requires_manual_review: boolean;
  display_order: number | null;
  notes: string | null;
}

interface PricingRule {
  id: string;
  rule_name: string;
  rule_version: number;
  material_system_id: string;
  coverage_profile_id: string;
  vehicle_type: string;
  labor_rate_per_sqft: number | null;
  print_rate_per_sqft: number | null;
  laminate_rate_per_sqft: number | null;
  install_rate_per_sqft: number | null;
  design_fee_min: number | null;
  setup_fee: number | null;
  minimum_job_price: number | null;
  waste_percent: number | null;
  complexity_multiplier_low: number | null;
  complexity_multiplier_medium: number | null;
  complexity_multiplier_high: number | null;
  internal_notes: string | null;
}

interface PricingSandboxData {
  phase: string;
  warning: string;
  material_systems: MaterialSystem[];
  coverage_profiles: CoverageProfile[];
  vehicle_sqft_profiles: VehicleSqftProfile[];
  pricing_rules: PricingRule[];
}

const unavailableMessage =
  'Pricing sandbox data is unavailable. Phase 3 pricing RPCs may not be installed yet.';

const formatPercent = (value: number | null) =>
  value === null || value === undefined ? 'Not set' : `${value}%`;

const formatNumber = (value: number | null) =>
  value === null || value === undefined ? 'Not set' : value.toString();

const formatCurrency = (value: number | null) =>
  value === null || value === undefined
    ? 'Not set'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const renderAreas = (areas: string[] | null) =>
  areas && areas.length > 0 ? areas.join(', ') : 'None listed';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const getValidVehicleProfiles = (profiles: VehicleSqftProfile[]) =>
  profiles.filter((profile) => isNonEmptyString(profile.id) && isNonEmptyString(profile.vehicle_type));

const getValidCoverageProfiles = (profiles: CoverageProfile[]) =>
  profiles.filter((profile) => isNonEmptyString(profile.id));

const getValidMaterialSystems = (systems: MaterialSystem[]) =>
  systems.filter((system) => isNonEmptyString(system.id));

const PricingSandboxUnavailableCard = ({
  onRetry,
  variant = 'warning'
}: {
  onRetry?: () => void;
  variant?: 'warning' | 'destructive';
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Pricing Sandbox</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <Alert variant={variant}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sandbox data unavailable</AlertTitle>
        <AlertDescription>{unavailableMessage}</AlertDescription>
      </Alert>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </CardContent>
  </Card>
);

const normalizePricingSandboxData = (rpcData: unknown): PricingSandboxData | null => {
  const source = Array.isArray(rpcData) ? rpcData[0] : rpcData;

  if (!isRecord(source)) {
    return null;
  }

  return {
    phase: typeof source.phase === 'string' ? source.phase : 'Phase 2H-B',
    warning: typeof source.warning === 'string' ? source.warning : unavailableMessage,
    material_systems: Array.isArray(source.material_systems)
      ? (source.material_systems as MaterialSystem[])
      : [],
    coverage_profiles: Array.isArray(source.coverage_profiles)
      ? (source.coverage_profiles as CoverageProfile[])
      : [],
    vehicle_sqft_profiles: Array.isArray(source.vehicle_sqft_profiles)
      ? (source.vehicle_sqft_profiles as VehicleSqftProfile[])
      : [],
    pricing_rules: Array.isArray(source.pricing_rules) ? (source.pricing_rules as PricingRule[]) : []
  };
};

const PricingCalculatorSandbox = () => {
  const [data, setData] = useState<PricingSandboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [selectedCoverageId, setSelectedCoverageId] = useState('');
  const [selectedMaterialSystemId, setSelectedMaterialSystemId] = useState('');

  const loadSandboxData = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_wrap_pricing_calculator_seed_data'
      );

      if (rpcError) {
        setError(rpcError.message || unavailableMessage);
        setData(null);
        return;
      }

      const nextData = normalizePricingSandboxData(rpcData);

      if (!nextData) {
        setError(unavailableMessage);
        setData(null);
        return;
      }

      const vehicleProfiles = getValidVehicleProfiles(nextData.vehicle_sqft_profiles);
      const coverageProfiles = getValidCoverageProfiles(nextData.coverage_profiles);
      const materialSystems = getValidMaterialSystems(nextData.material_systems);

      setData(nextData);
      setSelectedVehicleType(vehicleProfiles[0]?.vehicle_type ?? '');
      setSelectedCoverageId(coverageProfiles[0]?.id ?? '');
      setSelectedMaterialSystemId(materialSystems[0]?.id ?? '');
    } catch {
      setError(unavailableMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSandboxData();
  }, []);

  const selectedVehicle = useMemo(
    () => data?.vehicle_sqft_profiles.find((profile) => profile.vehicle_type === selectedVehicleType),
    [data?.vehicle_sqft_profiles, selectedVehicleType]
  );

  const selectedCoverage = useMemo(
    () => data?.coverage_profiles.find((profile) => profile.id === selectedCoverageId),
    [data?.coverage_profiles, selectedCoverageId]
  );

  const selectedMaterialSystem = useMemo(
    () => data?.material_systems.find((system) => system.id === selectedMaterialSystemId),
    [data?.material_systems, selectedMaterialSystemId]
  );

  const matchingRule = useMemo(
    () =>
      data?.pricing_rules.find(
        (rule) =>
          rule.material_system_id === selectedMaterialSystemId &&
          rule.coverage_profile_id === selectedCoverageId &&
          rule.vehicle_type === selectedVehicleType
      ),
    [data?.pricing_rules, selectedCoverageId, selectedMaterialSystemId, selectedVehicleType]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 text-sm font-medium text-slate-700">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading pricing sandbox data...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <PricingSandboxUnavailableCard variant="destructive" onRetry={() => void loadSandboxData()} />;
  }

  if (!data) {
    return <PricingSandboxUnavailableCard />;
  }

  const vehicleProfiles = getValidVehicleProfiles(data.vehicle_sqft_profiles);
  const coverageProfiles = getValidCoverageProfiles(data.coverage_profiles);
  const materialSystems = getValidMaterialSystems(data.material_systems);

  const hasRequiredSeedData =
    vehicleProfiles.length > 0 &&
    coverageProfiles.length > 0 &&
    materialSystems.length > 0;

  if (!hasRequiredSeedData) {
    return <PricingSandboxUnavailableCard onRetry={() => void loadSandboxData()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">{data.phase}</p>
          <h2 className="text-2xl font-semibold text-slate-900">Pricing Sandbox</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadSandboxData()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sandbox test data only</AlertTitle>
        <AlertDescription>{data.warning}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Sandbox Selection</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pricing-sandbox-vehicle">Vehicle test profile</Label>
            <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
              <SelectTrigger id="pricing-sandbox-vehicle">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicleProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.vehicle_type}>
                    {profile.vehicle_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricing-sandbox-coverage">Coverage profile</Label>
            <Select value={selectedCoverageId} onValueChange={setSelectedCoverageId}>
              <SelectTrigger id="pricing-sandbox-coverage">
                <SelectValue placeholder="Select coverage" />
              </SelectTrigger>
              <SelectContent>
                {coverageProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.coverage_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricing-sandbox-material">Material system</Label>
            <Select value={selectedMaterialSystemId} onValueChange={setSelectedMaterialSystemId}>
              <SelectTrigger id="pricing-sandbox-material">
                <SelectValue placeholder="Select material system" />
              </SelectTrigger>
              <SelectContent>
                {materialSystems.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.system_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Sqft Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selectedVehicle ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Vehicle</span>
                  <span className="font-medium text-slate-900">{selectedVehicle.vehicle_type}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Full wrap sqft</span>
                  <span>{formatNumber(selectedVehicle.full_wrap_sqft_estimate)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Side only sqft</span>
                  <span>{formatNumber(selectedVehicle.side_only_sqft_estimate)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Complexity</span>
                  <span>{selectedVehicle.surface_complexity ?? 'Not set'}</span>
                </div>
                {selectedVehicle.notes && (
                  <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
                    {selectedVehicle.notes}
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-500">No vehicle profile selected.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selectedCoverage ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Coverage</span>
                  <span className="font-medium text-slate-900">{selectedCoverage.coverage_name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Percent of full wrap</span>
                  <span>{formatPercent(selectedCoverage.default_percent_of_full_wrap)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Complexity adjustment</span>
                  <span>{formatPercent(selectedCoverage.complexity_adjustment_percent)}</span>
                </div>
                <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
                  Included: {renderAreas(selectedCoverage.included_areas)}
                </p>
              </>
            ) : (
              <p className="text-slate-500">No coverage profile selected.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Material System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
                {selectedMaterialSystem ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">System</span>
                  <span className="font-medium text-slate-900">{selectedMaterialSystem.system_name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Tier</span>
                  <Badge variant="outline">{selectedMaterialSystem.system_tier}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Default waste</span>
                  <span>{formatPercent(selectedMaterialSystem.default_waste_percent)}</span>
                </div>
                <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
                  Print: {selectedMaterialSystem.print_material?.brand ?? 'Brand not set'}{' '}
                  {selectedMaterialSystem.print_material?.product_name ?? 'Not available'}
                </p>
                <p className="text-xs text-slate-500">
                  Laminate: {selectedMaterialSystem.laminate_material?.brand ?? 'Brand not set'}{' '}
                  {selectedMaterialSystem.laminate_material?.product_name ?? 'Not available'}
                </p>
              </>
            ) : (
              <p className="text-slate-500">No material system selected.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matching Sandbox Pricing Rule</CardTitle>
        </CardHeader>
        <CardContent>
          {matchingRule ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Labor / sqft</TableHead>
                    <TableHead>Print / sqft</TableHead>
                    <TableHead>Laminate / sqft</TableHead>
                    <TableHead>Install / sqft</TableHead>
                    <TableHead>Design min</TableHead>
                    <TableHead>Setup</TableHead>
                    <TableHead>Minimum job</TableHead>
                    <TableHead>Waste</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      {matchingRule.rule_name} v{matchingRule.rule_version}
                    </TableCell>
                    <TableCell>{formatCurrency(matchingRule.labor_rate_per_sqft)}</TableCell>
                    <TableCell>{formatCurrency(matchingRule.print_rate_per_sqft)}</TableCell>
                    <TableCell>{formatCurrency(matchingRule.laminate_rate_per_sqft)}</TableCell>
                    <TableCell>{formatCurrency(matchingRule.install_rate_per_sqft)}</TableCell>
                    <TableCell>{formatCurrency(matchingRule.design_fee_min)}</TableCell>
                    <TableCell>{formatCurrency(matchingRule.setup_fee)}</TableCell>
                    <TableCell>{formatCurrency(matchingRule.minimum_job_price)}</TableCell>
                    <TableCell>{formatPercent(matchingRule.waste_percent)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {matchingRule.internal_notes && (
                <p className="mt-3 text-xs text-slate-500">{matchingRule.internal_notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No test pricing rule found for this sandbox combination.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Material Systems</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Print</TableHead>
                  <TableHead>Laminate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialSystems.map((system) => (
                  <TableRow key={system.id}>
                    <TableCell className="font-medium">{system.system_name}</TableCell>
                    <TableCell>{system.system_tier}</TableCell>
                    <TableCell>{system.print_material?.product_name ?? 'Not available'}</TableCell>
                    <TableCell>{system.laminate_material?.product_name ?? 'Not available'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage Profiles</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Percent</TableHead>
                  <TableHead>Manual review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverageProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.coverage_name}</TableCell>
                    <TableCell>{profile.coverage_key}</TableCell>
                    <TableCell>{formatPercent(profile.default_percent_of_full_wrap)}</TableCell>
                    <TableCell>{profile.requires_manual_review ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Sqft Profiles</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Body</TableHead>
                  <TableHead>Full wrap sqft</TableHead>
                  <TableHead>Surface</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.vehicle_type}</TableCell>
                    <TableCell>{profile.body_style ?? 'Not set'}</TableCell>
                    <TableCell>{formatNumber(profile.full_wrap_sqft_estimate)}</TableCell>
                    <TableCell>{profile.surface_complexity ?? 'Not set'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Rules</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Labor / sqft</TableHead>
                  <TableHead>Install / sqft</TableHead>
                  <TableHead>Waste</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pricing_rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      {rule.rule_name} v{rule.rule_version}
                    </TableCell>
                    <TableCell>{rule.vehicle_type}</TableCell>
                    <TableCell>{formatCurrency(rule.labor_rate_per_sqft)}</TableCell>
                    <TableCell>{formatCurrency(rule.install_rate_per_sqft)}</TableCell>
                    <TableCell>{formatPercent(rule.waste_percent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PricingCalculatorSandbox;
