"use client";

import { OrganizerSubscriptionsList } from "@/components/account/OrganizerSubscriptionsList";

export default function CompteOrganisateur·icesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organisateur·ices suivis</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les organisateur·ices dont vous recevez les annonces en direct.
        </p>
      </div>
      <OrganizerSubscriptionsList onlySubscribed />
    </div>
  );
}
