import { SPORT_CATEGORIES, SportCategory } from './sportCategoryRules';

export const SPORT_EQUIPMENT_KITS: Record<SportCategory, Record<string, number>> = {
    CRICKET: {
        'Cricket Bat': 2,
        'Cricket Ball': 1,
        'Cricket Stumps': 2,
    },
    BADMINTON: {
        'Badminton Racket': 4,
    },
    TABLE_TENNIS: {
        'TT Bat': 4,
        'TT Ball': 1,
    },
    BASKETBALL: {
        'Basketball': 1,
    },
    FOOTBALL: {
        'Football': 1,
    },
    VOLLEYBALL: {
        'Volleyball': 1,
    },
    TENNIS: {},
    GENERAL: {},
};

export const DEFAULT_MAX_QUANTITY_PER_ITEM = 1;

export function getMaxQuantityForItem(
    itemName: string,
    sportCategory: SportCategory
): number {
    const sportKit = SPORT_EQUIPMENT_KITS[sportCategory];

    if (!sportKit) {
        return DEFAULT_MAX_QUANTITY_PER_ITEM;
    }

    if (sportKit[itemName] !== undefined) {
        return sportKit[itemName];
    }

    for (const [kitItemName, maxQty] of Object.entries(sportKit)) {
        if (itemName.toLowerCase().includes(kitItemName.toLowerCase()) ||
            kitItemName.toLowerCase().includes(itemName.toLowerCase())) {
            return maxQty;
        }
    }

    return DEFAULT_MAX_QUANTITY_PER_ITEM;
}

export async function validateSportKitQuantities(
    items: Array<{ itemId: string | number; name: string; qty: number; sportCategory?: SportCategory }>,
    sportCategory: SportCategory
): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const itemQuantities: Record<string, number> = {};

    for (const item of items) {
        const key = item.name;
        itemQuantities[key] = (itemQuantities[key] || 0) + item.qty;
    }

    for (const [itemName, totalQty] of Object.entries(itemQuantities)) {
        const maxAllowed = getMaxQuantityForItem(itemName, sportCategory);

        if (totalQty > maxAllowed) {
            errors.push(
                `For ${sportCategory.replace('_', ' ')}, you can borrow at most ${maxAllowed} ${itemName}(s). You requested ${totalQty}.`
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

export const SPORT_FACILITY_MAPPING: Record<SportCategory, string[]> = {
    TABLE_TENNIS: ['Table Tennis'],
    BASKETBALL: ['Basketball Court'],
    BADMINTON: [],
    FOOTBALL: ['Main Turf'],
    CRICKET: ['Main Turf'],
    VOLLEYBALL: ['Volleyball Court'],
    TENNIS: [],
    GENERAL: [],
};

export function getSuggestedFacilities(sportCategory: SportCategory): string[] {
    return SPORT_FACILITY_MAPPING[sportCategory] || [];
}

export function getFacilityWarningMessage(sportCategory: SportCategory): string | null {
    const facilities = getSuggestedFacilities(sportCategory);

    if (facilities.length === 0) {
        return null;
    }

    const sportName = sportCategory.replace('_', ' ').toLowerCase();
    const facilityList = facilities.join(' or ');

    return `You're borrowing ${sportName} equipment without a ${facilityList} booking. Play responsibly wherever you're headed! 🏆`;
}
