import { ItemRecord, MatchFactor, PotentialMatchRecord } from '../types';

/**
 * Calculates attribute similarity between a Lost Item and a Found Item.
 * Based on the Capstone attribute-matching model (Category, Location, Color, Brand, Date, Keywords).
 */
export function calculateAttributeMatch(
  lostItem: ItemRecord,
  foundItem: ItemRecord
): { score: number; factors: MatchFactor[] } {
  // If one isn't lost and the other found, not a valid match pair
  if (lostItem.type === foundItem.type) {
    return { score: 0, factors: [] };
  }

  const factors: MatchFactor[] = [];
  let totalScore = 0;

  // 1. Category Matching (Weight: 30%)
  const isCategoryMatch =
    lostItem.category.toLowerCase() === foundItem.category.toLowerCase();
  const categoryScore = isCategoryMatch ? 30 : 0;
  totalScore += categoryScore;
  factors.push({
    factor: 'Category',
    match: isCategoryMatch,
    scoreWeight: 30,
    detail: isCategoryMatch
      ? `Identical category: ${lostItem.category}`
      : `Different categories (${lostItem.category} vs ${foundItem.category})`
  });

  // 2. Location Matching (Weight: 20%)
  const locLost = (lostItem.location || '').toLowerCase();
  const locFound = (foundItem.location || '').toLowerCase();
  let locationScore = 0;
  let locDetail = 'Different campus areas';

  if (locLost === locFound && locLost.length > 0) {
    locationScore = 20;
    locDetail = `Exact location match: ${lostItem.location}`;
  } else {
    // Check partial containment or same building keywords
    const keywords = ['library', 'lab', 'gym', 'canteen', 'cafeteria', 'lobby', 'gate 1', 'gate 2', 'academic', 'parking'];
    const matchingLocKeyword = keywords.find(k => locLost.includes(k) && locFound.includes(k));
    if (matchingLocKeyword) {
      locationScore = 14;
      locDetail = `Same campus building/zone (${matchingLocKeyword.toUpperCase()})`;
    }
  }
  totalScore += locationScore;
  factors.push({
    factor: 'Location',
    match: locationScore > 0,
    scoreWeight: 20,
    detail: locDetail
  });

  // 3. Color Matching (Weight: 15%)
  const colorLost = (lostItem.color || '').toLowerCase().trim();
  const colorFound = (foundItem.color || '').toLowerCase().trim();
  let colorScore = 0;
  let colorDetail = 'Different colors reported';

  if (colorLost && colorFound) {
    if (colorLost === colorFound) {
      colorScore = 15;
      colorDetail = `Exact color match: ${lostItem.color}`;
    } else if (
      colorLost.includes(colorFound) ||
      colorFound.includes(colorLost) ||
      (colorLost.includes('black') && colorFound.includes('grey')) ||
      (colorLost.includes('blue') && colorFound.includes('navy'))
    ) {
      colorScore = 10;
      colorDetail = `Similar color shade (${lostItem.color} ~ ${foundItem.color})`;
    }
  }
  totalScore += colorScore;
  factors.push({
    factor: 'Color',
    match: colorScore > 0,
    scoreWeight: 15,
    detail: colorDetail
  });

  // 4. Brand Matching (Weight: 15%)
  const brandLost = (lostItem.brand || '').toLowerCase().trim();
  const brandFound = (foundItem.brand || '').toLowerCase().trim();
  let brandScore = 0;
  let brandDetail = 'No brand match or unspecified';

  if (brandLost && brandFound && brandLost !== 'unknown' && brandFound !== 'unknown') {
    if (brandLost === brandFound) {
      brandScore = 15;
      brandDetail = `Exact brand match: ${lostItem.brand}`;
    } else if (brandLost.includes(brandFound) || brandFound.includes(brandLost)) {
      brandScore = 12;
      brandDetail = `Partial brand name match: ${lostItem.brand} / ${foundItem.brand}`;
    }
  }
  totalScore += brandScore;
  factors.push({
    factor: 'Brand',
    match: brandScore > 0,
    scoreWeight: 15,
    detail: brandDetail
  });

  // 5. Date Proximity (Weight: 10%)
  // Found date should be on or after lost date, or within reasonable reporting window (up to 14 days)
  let dateScore = 0;
  let dateDetail = 'Dates far apart or invalid';
  try {
    const tLost = new Date(lostItem.dateTime).getTime();
    const tFound = new Date(foundItem.dateTime).getTime();
    if (!isNaN(tLost) && !isNaN(tFound)) {
      const diffDays = Math.abs(tFound - tLost) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1) {
        dateScore = 10;
        dateDetail = 'Reported within 24 hours of incident';
      } else if (diffDays <= 4) {
        dateScore = 7;
        dateDetail = `Reported within ${Math.round(diffDays)} days of incident`;
      } else if (diffDays <= 10) {
        dateScore = 4;
        dateDetail = `Reported within ${Math.round(diffDays)} days`;
      }
    }
  } catch {
    // fallback
  }
  totalScore += dateScore;
  factors.push({
    factor: 'Date Proximity',
    match: dateScore > 0,
    scoreWeight: 10,
    detail: dateDetail
  });

  // 6. Keywords & Description Similarity (Weight: 10%)
  const stopWords = new Set(['the', 'and', 'with', 'for', 'item', 'lost', 'found', 'color', 'left', 'near', 'has', 'have']);
  const getTokens = (str: string) =>
    (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

  const tokensLost = new Set([...getTokens(lostItem.title), ...getTokens(lostItem.description)]);
  const tokensFound = new Set([...getTokens(foundItem.title), ...getTokens(foundItem.description)]);

  const sharedTokens = [...tokensLost].filter(t => tokensFound.has(t));
  let keywordScore = 0;
  let keywordDetail = 'No shared descriptive terms';

  if (sharedTokens.length >= 3) {
    keywordScore = 10;
    keywordDetail = `Multiple shared terms: "${sharedTokens.slice(0, 3).join(', ')}"`;
  } else if (sharedTokens.length > 0) {
    keywordScore = 5;
    keywordDetail = `Shared descriptive keyword: "${sharedTokens[0]}"`;
  }
  totalScore += keywordScore;
  factors.push({
    factor: 'Keywords',
    match: keywordScore > 0,
    scoreWeight: 10,
    detail: keywordDetail
  });

  return {
    score: Math.min(100, Math.round(totalScore)),
    factors
  };
}

/**
 * Scans an item against the existing items database and returns potential matches meeting threshold (>= 40%).
 */
export function findPotentialMatchesForItem(
  targetItem: ItemRecord,
  allExistingItems: ItemRecord[]
): PotentialMatchRecord[] {
  const matches: PotentialMatchRecord[] = [];
  const oppositeType = targetItem.type === 'lost' ? 'found' : 'lost';

  // Only consider items that are active and of the opposite type
  const candidates = allExistingItems.filter(
    item =>
      item.id !== targetItem.id &&
      item.type === oppositeType &&
      item.status !== 'Recovered' &&
      item.status !== 'Returned' &&
      item.status !== 'Closed'
  );

  for (const candidate of candidates) {
    const lost = targetItem.type === 'lost' ? targetItem : candidate;
    const found = targetItem.type === 'found' ? targetItem : candidate;

    const { score, factors } = calculateAttributeMatch(lost, found);

    // Minimum match threshold 40%
    if (score >= 40) {
      matches.push({
        id: `match_${lost.id}_${found.id}_${Date.now()}`,
        lostItemId: lost.id,
        foundItemId: found.id,
        lostItemTitle: lost.title,
        foundItemTitle: found.title,
        score,
        factors,
        status: 'pending',
        detectedAt: new Date().toISOString()
      });
    }
  }

  // Sort descending by match score
  return matches.sort((a, b) => b.score - a.score);
}
