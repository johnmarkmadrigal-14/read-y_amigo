import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { authRequest, getStoredUser, type ApiUser } from "../app/lib/api";

const channelId = "classroom";
const prefix = "classroom-reminder:";
const hour = 60 * 60 * 1000;
const mobile = Platform.OS === "android" || Platform.OS === "ios";
type Reminder = { id: string; at: number; body: string };
type Deadline = { _id: string; dueDate: string };
type Review = { _id: string; submittedAt: string };

let queue: Promise<unknown> = Promise.resolve();
let lastRegistration: { user: string; token: string | null } | undefined;

if (mobile) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function enqueue(task: () => Promise<void>) {
  if (!mobile) return Promise.resolve();
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

async function updateReminders(user: ApiUser | null, reminders: Reminder[]) {
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync())
    .filter(item => item.identifier.startsWith(prefix));
  const desired = new Map(reminders.map(reminder => [`${prefix}${user?._id}:${reminder.id}:${reminder.at}`, reminder]));

  for (const { identifier } of scheduled) {
    if (!desired.delete(identifier)) await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  for (const [identifier, reminder] of desired) {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: "Read-y Amigo", body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminder.at),
        channelId,
      },
    });
  }
}

async function loadReminders(user: ApiUser): Promise<Reminder[]> {
  if (user.role === "teacher") {
    const { items } = await authRequest<{ items: Review[] }>("/teacher-work/to-check");
    return items.map(item => ({
      id: item._id,
      at: Date.parse(item.submittedAt) + 24 * hour,
      body: "A submission has been waiting for review for one day. Open To-check to review it.",
    }));
  }
  const { deadlines } = await authRequest<{ deadlines: Deadline[] }>("/mobile-notifications/deadlines");
  return deadlines.flatMap(work => [24, 12, 1].map(hours => ({
    id: `${work._id}:${hours}`,
    at: Date.parse(work.dueDate) - hours * hour,
    body: `A class assignment is due in ${hours} ${hours === 1 ? "hour" : "hours"}.`,
  })));
}

async function registerPush(user: ApiUser, allowed: boolean) {
  let token: string | null = null;
  if (allowed) {
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  }
  if (lastRegistration?.user === user._id && lastRegistration.token === token) return;
  if ((await getStoredUser())?._id !== user._id) return;
  await authRequest("/mobile-notifications/device", { method: "PUT", body: { token } });
  lastRegistration = { user: user._id, token };
}

export function syncNotifications(user: ApiUser | null, prompt = false) {
  return enqueue(async () => {
    if ((await getStoredUser())?._id !== user?._id) return;
    if (!user) {
      lastRegistration = undefined;
      await updateReminders(null, []);
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(channelId, {
        name: "Classroom updates",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (prompt && permission.status === "undetermined" && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    const allowed = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    const push = registerPush(user, allowed).catch(error => {
      console.warn("Could not sync classroom push notifications:", error.message);
    });

    try {
      const reminders = allowed ? await loadReminders(user) : [];
      const now = Date.now();
      const upcoming = reminders.filter(item => item.at > now).sort((a, b) => a.at - b.at);
      if ((await getStoredUser())?._id !== user._id) return;
      await updateReminders(user, Platform.OS === "ios" ? upcoming.slice(0, 60) : upcoming);
    } finally {
      await push;
    }
  });
}
