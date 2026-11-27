import type * as BackgroundFetch from "expo-background-fetch";
import type * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { syncAppleHealth, syncHealthConnect } from "./device-health";
import { supabase } from "./supabase";

export const BACKGROUND_HEALTH_SYNC_TASK = "overtaek-background-health-sync";

async function loadTaskManager(): Promise<typeof TaskManager | null> {
  try {
    return await import("expo-task-manager");
  } catch {
    return null;
  }
}

async function loadBackgroundFetch(): Promise<typeof BackgroundFetch | null> {
  try {
    return await import("expo-background-fetch");
  } catch {
    return null;
  }
}

async function ensureBackgroundHealthSyncTaskDefined(): Promise<typeof TaskManager | null> {
  if (Platform.OS === "web") return null;
  const TaskManagerModule = await loadTaskManager();
  if (!TaskManagerModule) return null;
  try {
    if (!TaskManagerModule.isTaskDefined(BACKGROUND_HEALTH_SYNC_TASK)) {
      TaskManagerModule.defineTask(BACKGROUND_HEALTH_SYNC_TASK, runBackgroundHealthSyncTask);
    }
    return TaskManagerModule;
  } catch {
    return null;
  }
}

export async function runBackgroundHealthSyncTask(): Promise<BackgroundFetch.BackgroundFetchResult> {
  const BackgroundFetchModule = await loadBackgroundFetch();
  if (!BackgroundFetchModule) return 1;
  const { BackgroundFetchResult } = BackgroundFetchModule;
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return BackgroundFetchResult.NoData;
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user?.id) {
      return BackgroundFetchResult.NoData;
    }
    const result =
      Platform.OS === "ios"
        ? await syncAppleHealth({ skipIfEmpty: true })
        : await syncHealthConnect({ skipIfEmpty: true });
    if (!result.ok) {
      return BackgroundFetchResult.Failed;
    }
    return result.count > 0
      ? BackgroundFetchResult.NewData
      : BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetchResult.Failed;
  }
}

void ensureBackgroundHealthSyncTaskDefined();

/** Register periodic background health sync (iOS BackgroundFetch / Android WorkManager). */
export async function registerBackgroundHealthSync(): Promise<boolean> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  try {
    const BackgroundFetchModule = await loadBackgroundFetch();
    const TaskManagerModule = await ensureBackgroundHealthSyncTaskDefined();
    if (!BackgroundFetchModule || !TaskManagerModule) return false;
    const status = await BackgroundFetchModule.getStatusAsync();
    if (
      status === BackgroundFetchModule.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetchModule.BackgroundFetchStatus.Denied
    ) {
      return false;
    }
    const registered = await TaskManagerModule.isTaskRegisteredAsync(
      BACKGROUND_HEALTH_SYNC_TASK,
    );
    if (registered) return true;
    await BackgroundFetchModule.registerTaskAsync(BACKGROUND_HEALTH_SYNC_TASK, {
      minimumInterval: 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterBackgroundHealthSync(): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    const BackgroundFetchModule = await loadBackgroundFetch();
    const TaskManagerModule = await loadTaskManager();
    if (!BackgroundFetchModule || !TaskManagerModule) return;
    const registered = await TaskManagerModule.isTaskRegisteredAsync(
      BACKGROUND_HEALTH_SYNC_TASK,
    );
    if (registered) {
      await BackgroundFetchModule.unregisterTaskAsync(BACKGROUND_HEALTH_SYNC_TASK);
    }
  } catch {
    // Best-effort.
  }
}
