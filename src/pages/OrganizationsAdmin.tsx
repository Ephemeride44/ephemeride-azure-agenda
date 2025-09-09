import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserRoleContext } from '@/components/UserRoleProvider';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase as baseSupabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { OrganizationForm } from '@/components/organizations/OrganizationForm';
import { OrganizationUsers } from '@/components/organizations/OrganizationUsers';
import { Building2, Users, Trash2, Plus, Settings } from 'lucide-react';

const supabase: SupabaseClient = baseSupabase;

type Organization = Database["public"]["Tables"]["organizations"]["Row"] & {
  user_count?: number;
};

export const OrganizationsAdmin: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const { isSuperAdmin, user, isLoading: userLoading } = useUserRoleContext();
  const { toast } = useToast();


  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Calculer le nombre d'utilisateurs pour chaque organisation
      const orgsWithUserCount = await Promise.all(
        (data || []).map(async (org) => {
          const { count } = await supabase
            .from('organization_users')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);
          
          return {
            ...org,
            user_count: count || 0
          };
        })
      );
      
      setOrganizations(orgsWithUserCount);
    } catch (error) {
      console.error('Erreur lors de la récupération des organisations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les organisations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (organization: Organization) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: !organization.is_active })
        .eq('id', organization.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Organisation ${organization.is_active ? 'désactivée' : 'activée'}`,
      });

      fetchOrganizations();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'organisation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'organisation",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (organization: Organization) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Organisation supprimée",
      });

      fetchOrganizations();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'organisation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'organisation",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setShowCreateForm(false);
    setShowEditForm(false);
    setSelectedOrganization(null);
    fetchOrganizations();
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations();
    }
  }, [isSuperAdmin]);

  // Attendre que le chargement soit terminé avant de vérifier les permissions
  if (userLoading) {
    return (
      <AdminLayout title="Gestion des organisations" subtitle="Chargement...">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Chargement des permissions...
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AdminLayout title="Accès refusé" subtitle="Permissions insuffisantes">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Gestion des organisations" 
      subtitle="Créez et gérez les organisations et leurs membres"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Organisations
            </h2>
            <p className="text-muted-foreground">
              {organizations.length} organisation(s) enregistrée(s)
            </p>
          </div>
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nouvelle organisation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle organisation</DialogTitle>
              </DialogHeader>
              <OrganizationForm
                onSuccess={handleFormSuccess}
                onCancel={() => setShowCreateForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center">Chargement...</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>{org.contact_email || 'Non renseigné'}</TableCell>
                    <TableCell>
                      <Badge variant={org.is_active ? 'default' : 'secondary'}>
                        {org.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(org.created_at || '').toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog 
                          open={showUsersDialog && selectedOrganization?.id === org.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setSelectedOrganization(org);
                              setShowUsersDialog(true);
                            } else {
                              setShowUsersDialog(false);
                              setSelectedOrganization(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Users className="w-4 h-4" />
                              <Badge variant="secondary" className="text-xs">
                                {org.user_count || 0}
                              </Badge>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Utilisateurs - {org.name}</DialogTitle>
                            </DialogHeader>
                            {selectedOrganization && (
                              <OrganizationUsers organization={selectedOrganization} />
                            )}
                          </DialogContent>
                        </Dialog>

                        <Dialog 
                          open={showEditForm && selectedOrganization?.id === org.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setSelectedOrganization(org);
                              setShowEditForm(true);
                            } else {
                              setShowEditForm(false);
                              setSelectedOrganization(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Modifier l'organisation</DialogTitle>
                            </DialogHeader>
                            {selectedOrganization && (
                              <OrganizationForm
                                organization={selectedOrganization}
                                onSuccess={handleFormSuccess}
                                onCancel={() => {
                                  setShowEditForm(false);
                                  setSelectedOrganization(null);
                                }}
                              />
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(org)}
                        >
                          {org.is_active ? 'Désactiver' : 'Activer'}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer l'organisation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer "{org.name}" ?
                                Cette action est irréversible et supprimera tous les événements
                                et utilisateurs associés.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(org)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {organizations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aucune organisation créée pour le moment
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      </div>
    </AdminLayout>
  );
};
