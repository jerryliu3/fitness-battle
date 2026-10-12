import {
  DEMO_BATTLES,
  DEMO_CATEGORIES,
  demoStandings,
  type Battle,
  type BattleMode,
  type Category,
  type CategorySlug,
  type FitnessConnection,
  type StandingRow,
} from "@fitness-battle/shared";
import { fitnessProvider } from "../lib/fitness";

export type ScreenId = "home" | "join" | "standings" | "tracker";

type Listener = () => void;

class BattleStore {
  viewerId = "demo-user";
  battles: Battle[] = [...DEMO_BATTLES];
  categories: Category[] = [...DEMO_CATEGORIES];
  selectedCategory: CategorySlug = "running";
  selectedBattleId: string = DEMO_BATTLES[0]?.id ?? "";
  standings: StandingRow[] = demoStandings();
  inviteCode = "";
  trackerStatus: FitnessConnection = {
    userId: "demo-user",
    provider: "strava",
    connectedAt: null,
    status: "disconnected",
  };
  trackerMessage = "Connect a tracker to auto-score battles.";
  lastSyncSummary = "";
  screen: ScreenId = "home";
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    for (const listener of this.listeners) listener();
  }

  setScreen(screen: ScreenId) {
    this.screen = screen;
    this.emit();
  }

  selectCategory(slug: CategorySlug) {
    this.selectedCategory = slug;
    this.emit();
  }

  selectBattle(id: string) {
    this.selectedBattleId = id;
    this.standings = demoStandings(this.viewerId);
    this.screen = "standings";
    this.emit();
  }

  setInviteCode(code: string) {
    this.inviteCode = code.toUpperCase();
    this.emit();
  }

  joinBattle(mode: BattleMode) {
    const category = this.categories.find(
      (c) => c.slug === this.selectedCategory,
    );
    const code =
      this.inviteCode.trim() ||
      (mode === "one_v_one" ? "DUEL01" : "SUNRISE");
    const existing = this.battles.find(
      (b) => b.inviteCode.toUpperCase() === code.toUpperCase(),
    );

    if (existing) {
      this.selectedBattleId = existing.id;
      this.standings = demoStandings(this.viewerId);
      this.screen = "standings";
      this.emit();
      return existing;
    }

    const battle: Battle = {
      id: `battle-${Date.now()}`,
      name: mode === "one_v_one" ? "Quick Duel" : "Pickup Pack",
      mode,
      categoryId: category?.id ?? "cat-running",
      categorySlug: this.selectedCategory,
      periodKind: "weekly",
      status: "active",
      inviteCode: code,
      createdBy: this.viewerId,
      createdAt: new Date().toISOString(),
    };
    this.battles = [battle, ...this.battles];
    this.selectedBattleId = battle.id;
    this.standings = demoStandings(this.viewerId);
    this.screen = "standings";
    this.emit();
    return battle;
  }

  async connectTracker() {
    const result = await fitnessProvider.connect(this.viewerId);
    this.trackerStatus = await fitnessProvider.getConnection(this.viewerId);
    this.trackerMessage = result.message;
    this.emit();
    return result;
  }

  async syncTracker() {
    const result = await fitnessProvider.syncActivities(this.viewerId, {
      categorySlug: this.selectedCategory,
    });
    const total = result.activities.reduce((sum, a) => sum + a.metricValue, 0);
    this.lastSyncSummary = result.usedMock
      ? `Stub sync: ${result.activities.length} activities (~${Math.round(total)} units).`
      : `Synced ${result.activities.length} activities.`;
    this.emit();
    return result;
  }

  get selectedBattle(): Battle | undefined {
    return this.battles.find((b) => b.id === this.selectedBattleId);
  }
}

export const battleStore = new BattleStore();
