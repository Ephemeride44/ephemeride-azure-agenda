import { LegalSection } from "@/components/LegalShell";

/** Corps des Conditions d'utilisation (réutilisé par la page et la dialog). */
export function ConditionsContent() {
  return (
    <>
      <LegalSection title="Objet">
        <p>
          Éphéméride (ephemeride.link) est l'agenda culturel et citoyen du vignoble nantais. Le service
          recense des événements et permet, gratuitement, de les consulter, de les mettre en favori et de
          suivre des communes ou des organisateurices.
        </p>
      </LegalSection>

      <LegalSection title="Compte utilisateur">
        <p>
          La création d'un compte est facultative ; elle débloque les favoris, les abonnements et les
          notifications. Vous êtes responsable de la confidentialité de votre mot de passe. Vous pouvez
          supprimer votre compte à tout moment depuis « Mon profil », ce qui efface l'ensemble de vos données.
        </p>
      </LegalSection>

      <LegalSection title="Contenu et contributions">
        <p>
          Les événements peuvent être proposés par les utilisateurices et les organisateurices, puis validés
          par l'équipe avant publication. Éphéméride s'efforce d'assurer l'exactitude des informations mais ne
          peut en garantir l'exhaustivité : vérifiez toujours les détails (date, lieu, tarif) auprès de
          l'organisateur·ice.
        </p>
      </LegalSection>

      <LegalSection title="Gratuité">
        <p>Le service est gratuit et sans publicité.</p>
      </LegalSection>

      <LegalSection title="Mentions légales">
        <p>
          <strong>Éditeur :</strong> Éphéméride.
          <br />
          <strong>Directeur de la publication :</strong> Amaury Cornut.
          <br />
          <strong>Développement :</strong> Leny Bernard.
          <br />
          <strong>Hébergement du site :</strong> Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
          <br />
          <strong>Hébergement de la base de données :</strong> Supabase (base de données et authentification).
          <br />
          <strong>Contact :</strong>{" "}
          <a href="mailto:bonjour@ephemeride.link" className="text-accent-peach hover:underline">
            bonjour@ephemeride.link
          </a>
          .
        </p>
      </LegalSection>
    </>
  );
}

/** Corps de la Politique de confidentialité (réutilisé par la page et la dialog). */
export function ConfidentialiteContent() {
  return (
    <>
      <LegalSection title="Données collectées">
        <p>Si vous créez un compte, nous traitons :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>votre adresse e-mail (identifiant de connexion) ;</li>
          <li>votre prénom, nom et photo de profil, si vous les renseignez ;</li>
          <li>vos favoris, vos communes et organisateurices suivis ;</li>
          <li>vos préférences de notifications et vos abonnements push (par appareil).</li>
        </ul>
      </LegalSection>

      <LegalSection title="Finalités">
        <p>
          Ces données servent uniquement à fournir le service : synchroniser vos favoris, vous envoyer les
          alertes que vous avez choisies et personnaliser votre fil. Aucune publicité, aucune revente de
          données.
        </p>
      </LegalSection>

      <LegalSection title="Hébergement et sous-traitants">
        <p>
          Le site est hébergé par <strong>Vercel</strong>. Les données de compte sont stockées via{" "}
          <strong>Supabase</strong> (base de données et authentification). Les e-mails transactionnels
          (confirmation, réinitialisation) sont envoyés via <strong>Resend</strong>. Ces prestataires
          n'utilisent vos données que pour faire fonctionner le service.
        </p>
      </LegalSection>

      <LegalSection title="Mesure d'audience">
        <p>
          Nous utilisons <strong>PostHog</strong> pour analyser l'utilisation du site et suivre son activité
          (pages consultées, fonctionnalités utilisées), afin d'améliorer le service. Ces données servent à
          des fins statistiques et ne sont ni revendues, ni utilisées à des fins publicitaires.
        </p>
      </LegalSection>

      <LegalSection title="Conservation">
        <p>
          Vos données sont conservées tant que votre compte existe. La suppression de votre compte (depuis
          « Mon profil ») entraîne l'effacement définitif de l'ensemble de vos données associées.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous pouvez consulter et modifier vos informations depuis « Mon profil », gérer vos abonnements et
          notifications depuis votre espace compte, et supprimer votre compte à tout moment. Pour toute
          question relative à vos données, écrivez à{" "}
          <a href="mailto:bonjour@ephemeride.link" className="text-accent-peach hover:underline">
            bonjour@ephemeride.link
          </a>
          .
        </p>
      </LegalSection>
    </>
  );
}
