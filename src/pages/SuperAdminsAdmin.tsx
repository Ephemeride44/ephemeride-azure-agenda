import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useUserRoleContext } from '@/components/UserRoleProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Crown, Shield } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type SuperAdmin = Database['public']['Tables']['super_admins']['Row'] & {
  user_email?: string;
  user_name?: string;
};

const SuperAdminsAdmin: React.FC = () => {
  const { isSuperAdmin } = useUserRoleContext();
  const { toast } = useToast();
  
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<SuperAdmin | null>(null);

  const fetchSuperAdmins = async () => {
    try {
      setLoading(true);
      
      // Récupérer les super admins avec les données utilisateur via RPC
      const { data, error } = await supabase
        .rpc('get_super_admins_with_user_info');

      if (error) {
        console.error('Erreur détaillée super admins:', error);
        throw error;
      }

      // Enrichir les données avec les métadonnées utilisateur
      const enrichedData: SuperAdmin[] = (data || []).map(admin => ({
        ...admin,
        user_email: admin.user_email || 'Email non disponible',
        user_name: admin.user_raw_user_meta_data?.name || 
                   admin.user_raw_user_meta_data?.full_name ||
                   admin.user_email?.split('@')[0] || 
                   'Nom non disponible'
      }));

      setSuperAdmins(enrichedData);
    } catch (error) {
      console.error('Erreur lors de la récupération des super admins:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des super admins",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuperAdmin = async () => {
    if (!newUserEmail.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un email",
        variant: "destructive",
      });
      return;
    }

    try {
      // Ici on devrait d'abord vérifier si l'utilisateur existe
      // et récupérer son user_id, mais pour simplifier on va juste
      // laisser l'admin saisir l'email et on gérera cela côté backend
      
      toast({
        title: "Information",
        description: "La fonctionnalité d'ajout de super admin sera implémentée prochainement",
        variant: "default",
      });

      setShowAddForm(false);
      setNewUserEmail('');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du super admin:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le super admin",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSuperAdmin = async (admin: SuperAdmin) => {
    try {
      const { error } = await supabase
        .from('super_admins')
        .update({ is_active: false })
        .eq('id', admin.id);

      if (error) throw error;

      toast({
        title: "Super admin supprimé",
        description: "Le super admin a été désactivé avec succès",
      });

      setShowDeleteConfirm(false);
      setAdminToDelete(null);
      await fetchSuperAdmins();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le super admin",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSuperAdmins();
  }, []);

  // Redirection si pas super admin
  if (!isSuperAdmin) {
    return (
      <AdminLayout title="Accès refusé" subtitle="">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Accès refusé</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Super Administrateurs" subtitle="Gestion des super administrateurs du système">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <CardTitle>Liste des Super Administrateurs</CardTitle>
              </div>
              <Button onClick={() => setShowAddForm(true)} className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Ajouter un Super Admin</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p>Chargement...</p>
              </div>
            ) : superAdmins.length === 0 ? (
              <div className="text-center py-8">
                <Crown className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Aucun super administrateur trouvé</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {superAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div>
                          <div className="text-sm">{admin.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.is_active ? "default" : "secondary"}>
                          {admin.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {admin.created_at ? new Date(admin.created_at).toLocaleDateString('fr-FR') : '-'}
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog d'ajout */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un Super Administrateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email de l'utilisateur</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="admin@exemple.com"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddSuperAdmin}>
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la désactivation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir désactiver ce super administrateur ? 
              Cette action peut être annulée en réactivant le compte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAdminToDelete(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => adminToDelete && handleDeleteSuperAdmin(adminToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default SuperAdminsAdmin;
