import type { ResolvedAnimation } from '../assets/resolver';
import type { Severity, SystemState } from '../state/engine';

export interface RingWindowModel {
  readonly usedPercent: number | null;
  readonly severity: Severity;
}

export type BadgeState = Exclude<SystemState, 'active'>;

/** The secondary provider's arcs, drawn as a thinner ring inside the primary. */
export interface SecondaryRingModel {
  readonly session: RingWindowModel;
  readonly weekly: RingWindowModel;
  readonly stale: boolean;
}

export interface PetOverlayViewModel {
  readonly system: SystemState;
  readonly stale: boolean;
  readonly session: RingWindowModel;
  readonly weekly: RingWindowModel;
  /**
   * Present only while the secondary provider has live usage to show. The
   * overlay needs no setting for this: when the other provider is signed out
   * or unavailable the inner ring simply is not drawn.
   */
  readonly secondary: SecondaryRingModel | null;
  readonly animation: ResolvedAnimation;
  readonly petName: string;
  /** Rendered edge length in CSS pixels, already clamped to the overlay window. */
  readonly size: number;
}
