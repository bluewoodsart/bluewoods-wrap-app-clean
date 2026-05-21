// Vehicle data for dropdowns
export const vehicleMakes = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 
  'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jeep', 'Kia', 
  'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 
  'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
];

export const vehicleModels: Record<string, string[]> = {
  'Toyota': ['Camry', 'Corolla', 'Prius', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', 'Sienna', '4Runner', 'Avalon'],
  'Honda': ['Accord', 'Civic', 'CR-V', 'Pilot', 'Odyssey', 'Fit', 'HR-V', 'Passport', 'Ridgeline', 'Insight'],
  'Ford': ['F-150', 'Escape', 'Explorer', 'Mustang', 'Focus', 'Fusion', 'Edge', 'Expedition', 'Transit', 'Ranger'],
  'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Tahoe', 'Suburban', 'Camaro', 'Corvette', 'Traverse', 'Impala', 'Cruze'],
  'Nissan': ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Murano', 'Maxima', 'Frontier', 'Titan', 'Armada', 'Versa'],
  'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'X1', '7 Series', 'X7', '4 Series', '2 Series', 'i3'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLC', 'A-Class', 'CLA', 'GLS', 'GLB', 'G-Class'],
  'Audi': ['A4', 'A6', 'Q5', 'Q7', 'A3', 'Q3', 'A8', 'Q8', 'e-tron', 'A5'],
  'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Accent', 'Veloster', 'Genesis', 'Palisade', 'Kona', 'Ioniq'],
  'Kia': ['Optima', 'Forte', 'Sorento', 'Sportage', 'Soul', 'Rio', 'Stinger', 'Telluride', 'Niro', 'Cadenza'],
  'Subaru': ['Outback', 'Forester', 'Impreza', 'Legacy', 'Crosstrek', 'Ascent', 'WRX', 'BRZ'],
  'Mazda': ['Mazda3', 'Mazda6', 'CX-5', 'CX-9', 'CX-3', 'MX-5 Miata', 'CX-30'],
  'Volkswagen': ['Jetta', 'Passat', 'Tiguan', 'Atlas', 'Golf', 'Beetle', 'Arteon'],
  'Lexus': ['ES', 'RX', 'NX', 'GX', 'LX', 'IS', 'GS', 'LS', 'UX', 'LC'],
  'Acura': ['TLX', 'MDX', 'RDX', 'ILX', 'TLX Type S', 'NSX'],
  'Infiniti': ['Q50', 'QX60', 'QX80', 'Q60', 'QX50', 'Q70'],
  'Cadillac': ['Escalade', 'XT5', 'CT6', 'ATS', 'CTS', 'XT4', 'CT5'],
  'Lincoln': ['Navigator', 'MKX', 'MKZ', 'Continental', 'Aviator', 'Corsair'],
  'Buick': ['Enclave', 'Encore', 'LaCrosse', 'Regal', 'Envision'],
  'GMC': ['Sierra', 'Acadia', 'Terrain', 'Yukon', 'Canyon', 'Savana'],
  'Dodge': ['Charger', 'Challenger', 'Durango', 'Journey', 'Grand Caravan'],
  'Chrysler': ['300', 'Pacifica', 'Voyager'],
  'Jeep': ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade', 'Gladiator'],
  'Ram': ['1500', '2500', '3500', 'ProMaster'],
  'Tesla': ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck'],
  'Volvo': ['XC90', 'XC60', 'S60', 'V60', 'XC40', 'S90', 'V90'],
  'Mitsubishi': ['Outlander', 'Eclipse Cross', 'Mirage', 'Outlander Sport']
};

export const generateYears = (): string[] => {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear; year >= 2000; year--) {
    years.push(year.toString());
  }
  return years;
};