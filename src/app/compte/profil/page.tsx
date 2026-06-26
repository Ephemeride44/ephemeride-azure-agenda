"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Eye, EyeOff, Lock, Moon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AvatarUploader } from "@/components/account/AvatarUploader";

export default function CompteProfilPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast({
        title: "Au revoir 😿",
        description: "Votre compte a été supprimé. Merci d'avoir fait un bout de chemin avec Éphéméride — à bientôt peut-être !",
      });
      await signOut();
      router.push("/");
    } catch (err) {
      toast({
        title: "Échec de la suppression",
        description: err instanceof Error ? err.message : "Réessayez plus tard.",
        variant: "destructive",
      });
      setDeletingAccount(false);
    }
  };

  useEffect(() => {
    const meta = user?.user_metadata ?? {};
    setFirstName((meta.first_name as string) || "");
    setLastName((meta.last_name as string) || "");
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const full_name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const { error } = await supabase.auth.updateUser({
      data: { ...user.user_metadata, first_name: firstName.trim(), last_name: lastName.trim(), full_name },
    });
    setSavingProfile(false);
    toast(
      error
        ? { title: "Erreur", description: error.message, variant: "destructive" }
        : { title: "Profil enregistré" },
    );
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || newPassword.length < 6) {
      toast({ title: "Erreur", description: "Mot de passe actuel requis et nouveau de 6 caractères min.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });
      if (signInError) {
        toast({ title: "Erreur", description: "Le mot de passe actuel est incorrect.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Mot de passe modifié" });
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Échec.", variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-sm text-muted-foreground">Gérez vos informations personnelles et votre connexion.</p>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Photo de profil</p>
            <p className="text-sm text-muted-foreground">
              JPG ou PNG, 2 Mo max. Vos initiales sont utilisées par défaut.
            </p>
          </div>
          <AvatarUploader size="h-16 w-16" withActions />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first-name">Prénom</Label>
          <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Nom</Label>
          <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Adresse e-mail</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={user?.email ?? ""} disabled className="min-w-0 flex-1" />
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">
            <BadgeCheck className="h-3.5 w-3.5" />
            Vérifié
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      <Separator />

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">Mot de passe</p>
              <p className="text-sm text-muted-foreground">Sécurisez votre compte.</p>
            </div>
            {!showPasswordForm && (
              <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(true)}>
                <Lock className="mr-1 h-4 w-4" />
                Modifier
              </Button>
            )}
          </div>
          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
              <PasswordField id="current-password" label="Mot de passe actuel" value={currentPassword} onChange={setCurrentPassword} show={showCurrent} onToggle={() => setShowCurrent((s) => !s)} />
              <PasswordField id="new-password" label="Nouveau mot de passe" value={newPassword} onChange={setNewPassword} show={showNew} onToggle={() => setShowNew((s) => !s)} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPasswordForm(false)} disabled={changingPassword}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={changingPassword}>
                  {changingPassword ? "Modification…" : "Enregistrer"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Moon className="mt-0.5 h-5 w-5 text-accent-violet" />
              <div>
                <p className="font-medium">Apparence</p>
                <p className="text-sm text-muted-foreground">Basculer entre le thème clair et sombre.</p>
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
              aria-label="Mode sombre"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Zone de danger */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Supprimer mon compte</p>
              <p className="text-sm text-muted-foreground">
                Suppression définitive de votre compte et de toutes vos données (favoris, abonnements,
                notifications). Cette action est irréversible.
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="shrink-0" disabled={deletingAccount}>
                {deletingAccount ? "Suppression…" : "Supprimer"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer définitivement votre compte ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Vos favoris, abonnements aux communes et organisateurs, préférences et notifications
                  seront définitivement supprimés. Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleDeleteAccount()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer mon compte
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

const PasswordField = ({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" required minLength={6} />
      <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={show ? "Masquer" : "Afficher"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);
