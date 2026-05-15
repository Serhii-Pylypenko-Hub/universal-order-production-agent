export function calculateRecommendedPrice(newCost, marginPercent, bufferPercent = 5) {
  return Number((Number(newCost) * (1 + Number(marginPercent) / 100 + Number(bufferPercent) / 100)).toFixed(2));
}

export function detectCostChange(oldCost, newCost, thresholdPercent = 3, criticalPercent = 10) {
  if (!oldCost || Number(oldCost) === 0) {
    return { percent: 0, status: "NotRequired" };
  }
  const percent = ((Number(newCost) - Number(oldCost)) / Number(oldCost)) * 100;
  let status = "NotRequired";
  if (Math.abs(percent) > criticalPercent) status = "CriticalRecalculated";
  else if (Math.abs(percent) > thresholdPercent) status = "ReviewRequired";
  return { percent: Number(percent.toFixed(2)), status };
}
