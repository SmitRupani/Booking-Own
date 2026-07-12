import { NextResponse } from 'next/server';
import { POLICIES, loadDynamicPolicies } from '@/lib/policies';

const CLIENT_POLICY_KEYS = [
  'ADVANCE_BOOKING_DAYS',
  'MIN_BOOKING_DURATION_MINUTES',
  'MAX_BOOKING_DURATION_MINUTES',
  'WORKING_HOURS_START',
  'WORKING_HOURS_END',
  'NO_SHOW_GRACE_MINUTES',
  'ROOM_BOOKING_MIN_LEAD_MINUTES',
  'QR_EQUIPMENT_PICKUP_WINDOW',
  'RESCHEDULE_BLOCK_WINDOW_HOURS',
  'PENALTY_THRESHOLD_LEVEL_0',
  'PENALTY_THRESHOLD_LEVEL_1',
  'PENALTY_THRESHOLD_LEVEL_2',
] as const;

type ClientPolicyKey = (typeof CLIENT_POLICY_KEYS)[number];

export async function GET() {
  try {
    const keys = [...CLIENT_POLICY_KEYS] as any;
    const dynamic = await loadDynamicPolicies(keys);

    return NextResponse.json({
      policies: {
        ...Object.fromEntries(
          CLIENT_POLICY_KEYS.map((key) => [key, (dynamic as any)[key]])
        ),
      },
    });
  } catch (error) {
    console.error('Client policies fetch error:', error);

    const fallback: Record<ClientPolicyKey, number> = {} as any;
    CLIENT_POLICY_KEYS.forEach((key) => {
      fallback[key] = (POLICIES as any)[key];
    });

    return NextResponse.json(
      { policies: fallback, fallback: true },
      { status: 200 }
    );
  }
}
