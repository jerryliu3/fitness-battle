import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { syncAppleHealth, syncHealthConnect } from "./device-health";
import { supabase } from "./supabase";

export const BACKGROUND_HEALTH_SYNC_TASK = "overtaek-background-health-sync";

export async function runBackgroundHealthSyncTask(): Promise<BackgroundFetch.BackgroundFetchResult> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user?.id) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    const result =
      Platform.OS === "ios"
        ? await syncAppleHealth()
        : await syncHealthConnect();
    if (!result.ok) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    return result.count > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(BACKGROUND_HEALTH_SYNC_TASK)) {
  TaskManager.defineTask(BACKGROUND_HEALTH_SYNC_TASK, runBackgroundHealthSyncTask);
}

/** Register periodic background health sync (iOS BackgroundFetch / Android WorkManager). */
export async function registerBackgroundHealthSync(): Promise<boolean> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return false;
    }
    const registered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_HEALTH_SYNC_TASK,
    );
    if (registered) return true;
    await BackgroundFetch.registerTaskAsync(BACKGROUND_HEALTH_SYNC_TASK, {
      minimumInterval: 15 * 60,
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
    const registered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_HEALTH_SYNC_TASK,
    );
    if (registered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_HEALTH_SYNC_TASK);
    }
  } catch {
    // Best-effort.
  }
}
