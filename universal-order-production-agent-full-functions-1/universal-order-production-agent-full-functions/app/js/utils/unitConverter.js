const CONVERSION_TABLE = {
  // weight
  g:   { kg: 0.001, g: 1 },
  kg:  { g: 1000,   kg: 1 },
  // volume
  ml:  { l: 0.001, ml: 1 },
  l:   { ml: 1000,  l: 1 },
  // count and pack — no conversion between families
  pcs: { pcs: 1 },
  pack: { pack: 1 }
};

const VALID_UNITS = new Set(Object.keys(CONVERSION_TABLE));

export function validateUnit(unit) {
  return VALID_UNITS.has(unit);
}

export function convert(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value;

  const factor = CONVERSION_TABLE[fromUnit]?.[toUnit];
  if (factor === undefined) {
    throw new Error(`No conversion from '${fromUnit}' to '${toUnit}'.`);
  }
  return Number((value * factor).toFixed(6));
}

export function canConvert(fromUnit, toUnit) {
  if (fromUnit === toUnit) return true;
  return CONVERSION_TABLE[fromUnit]?.[toUnit] !== undefined;
}
