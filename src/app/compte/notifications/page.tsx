"use client";

import { NotificationPreferences } from "@/components/account/NotificationPreferences";

export default function CompteNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Choisissez ce dont vous voulez être prévenu·e. Vous gardez le contrôle.
        </p>
      </div>
      <NotificationPreferences />
    </div>
  );
}
