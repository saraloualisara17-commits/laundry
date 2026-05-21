/**
 * Formats the items of an order into a human-readable summary.
 * Example: "2 Couvertures • 1 Tapis (6.50 m²)"
 */
export const formatOrderItemsSummary = (commandeTapis: any[] | undefined, t: any): string => {
  if (!commandeTapis || commandeTapis.length === 0) {
    return t('common.no_items', { defaultValue: 'Aucun article' });
  }

  // Group items by product name
  const groups: Record<string, { count: number; totalArea: number; isPerM2: boolean }> = {};

  commandeTapis.forEach((item) => {
    const name = item.productNom || t('common.unknown_product', { defaultValue: 'Produit' });
    const isPerM2 = item.modeTarification === 'PER_M2';
    const area = (isPerM2 && item.largeur && item.hauteur) 
      ? (parseFloat(item.largeur) * parseFloat(item.hauteur)) 
      : 0;

    if (!groups[name]) {
      groups[name] = { count: 0, totalArea: 0, isPerM2 };
    }

    groups[name].count += (item.quantite || 1);
    groups[name].totalArea += area * (item.quantite || 1);
  });

  // Convert groups to summary strings
  const summaryParts = Object.entries(groups).map(([name, data]) => {
    let part = `${data.count} ${name}`;
    if (data.isPerM2 && data.totalArea > 0) {
      part += ` (${data.totalArea.toFixed(2)} m²)`;
    }
    return part;
  });

  return summaryParts.join(' • ');
};
