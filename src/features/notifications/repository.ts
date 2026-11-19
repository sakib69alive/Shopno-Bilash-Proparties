import { createPrismaRepository } from "@/lib/prismaRepository";
import type { Repository } from "@/lib/repository";
import type { Notification } from "@/types/notification";
import type { NotificationPreference } from "@/types/notificationPreference";
import { sendPushToUser } from "@/features/push/send";

/**
 * Reference implementation of the `src/lib/repository.ts` pattern for the
 * Notification domain (`types/notification.ts`). Backed by the real database —
 * see `src/lib/prismaRepository.ts`.
 *
 * Every notification created anywhere (admin announcement, payment received,
 * new payment due, overdue reminder…) is also pushed to the phones the client
 * allowed notifications on. That single hook is why no caller needs to know
 * about push. `sendPushToUser` never throws.
 */
const baseNotificationRepository = createPrismaRepository<Notification>("notification");

export const notificationRepository: Repository<Notification> = {
  ...baseNotificationRepository,
  async create(entity) {
    const created = await baseNotificationRepository.create(entity);
    if (created.channel === "in-app") {
      await sendPushToUser(created.recipientUserId, {
        title: created.title,
        body: created.body,
        url: created.actionHref ?? "/portal/notifications",
        tag: created.relatedEntityId ? `${created.event}:${created.relatedEntityId}` : undefined,
      });
    }
    return created;
  },
};

/** Prompt 9 §13 — one row per user, see `types/notificationPreference.ts`'s doc comment. */
export const notificationPreferenceRepository: Repository<NotificationPreference> =
  createPrismaRepository<NotificationPreference>("notificationPreference");
