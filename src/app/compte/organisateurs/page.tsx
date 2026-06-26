"use client";

import { OrganizerSubscriptionsList } from "@/components/account/OrganizerSubscriptionsList";

export default function CompteOrganisateursPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organisateurs suivis</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les organisateurs dont vous recevez les annonces en direct.
        </p>
      </div>
      <OrganizerSubscriptionsList onlySubscribed />
    </div>
  );
}
