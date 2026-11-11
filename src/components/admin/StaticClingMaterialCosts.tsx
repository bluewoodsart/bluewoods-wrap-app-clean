import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const materials = [
  {
    name: 'White static cling',
    product: 'General Formulations 208',
    rollPrice: 153.87,
    source: 'https://www.lexjet.com/en/general-formulations-208-white-static-cling-54in-x-75ft'
  },
  {
    name: 'Clear static cling',
    product: 'General Formulations 207',
    rollPrice: 150.69,
    source: 'https://www.lexjet.com/en/general-formulations-207-clear-static-cling-54in-x-75ft'
  }
];

const rollWidthInches = 54;
const rollLengthFeet = 75;
const grossSquareFeet = (rollWidthInches / 12) * rollLengthFeet;

const StaticClingMaterialCosts = () => (
  <Card>
    <CardHeader>
      <CardTitle>Static Cling Material Costs</CardTitle>
      <p className="text-sm text-slate-600">
        LexJet price reference · Checked November 11, 2026 · USD
      </p>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {materials.map((material) => (
          <div key={material.product} className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">{material.name}</h3>
            <p className="text-sm text-slate-600">{material.product}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt>Roll size</dt><dd>{rollWidthInches} in × {rollLengthFeet} ft</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt>Gross roll area</dt><dd>{grossSquareFeet} sq. ft.</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt>Listed roll price</dt><dd>${material.rollPrice.toFixed(2)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 font-semibold">
                <dt>Raw material / gross sq. ft.</dt>
                <dd>${(material.rollPrice / grossSquareFeet).toFixed(4)}</dd>
              </div>
            </dl>
            <a href={material.source} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-blue-700 underline underline-offset-2">
              View {material.product} at LexJet
            </a>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        Raw material reference only, not a customer selling price. Shipping, tax, ink, waste,
        labor, and finishing are excluded. Gross roll area is not guaranteed usable print area.
        Confirm current price, stock, and HP Latex 730W media settings before ordering or printing.
        Clear cling may require white ink for the desired appearance.
      </p>
      <p className="text-xs text-slate-500">
        These reference costs do not change vehicle-wrap pricing rules or quotes.
      </p>
    </CardContent>
  </Card>
);

export default StaticClingMaterialCosts;
