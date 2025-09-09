import { useState, useEffect, useRef } from "react";
import { useCookies } from 'react-cookie';
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from "@/integrations/supabase/types";

const supabase: SupabaseClient = baseSupabase;

type UserRole = Database["public"]["Enums"]["user_role"];
type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export interface UserOrganization {
  organization_id: string;
  organization_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface UserContext {
  user: any | null;
  isLoading: boolean;
  organizations: UserOrganization[];
  currentOrganization: UserOrganization | null;
  isSuperAdmin: boolean;
  isOrganizationAdmin: boolean;
  setCurrentOrganization: (org: UserOrganization | null) => void;
  refreshUserData: () => Promise<void>;
}

export const useUserRole = (): UserContext => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<UserOrganization | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isOrganizationAdmin, setIsOrganizationAdmin] = useState(false);
  const [cookies, setCookie, removeCookie] = useCookies(['selectedOrganization']);

  // Ajouter une ref pour éviter les races conditions
  const isRefreshingRef = useRef(false);

  const refreshUserData = async () => {
    if (isRefreshingRef.current) {
      return;
    }
    
    try {
      isRefreshingRef.current = true;
      setIsLoading(true);
      
      const result = await supabase.auth.getSession();
      const session = result.data?.session;
      
      if (!session?.user) {
        setUser(null);
        setOrganizations([]);
        setCurrentOrganization(null);
        setIsSuperAdmin(false);
        setIsOrganizationAdmin(false);
        setIsLoading(false);
        // Nettoyer le cookie lors de la déconnexion
        removeCookie('selectedOrganization', { path: '/' });
        return;
      }

      setUser(session.user);

      // Vérifier d'abord si super admin
      const { data: superAdminCheck, error: superAdminError } = await supabase
        .rpc('is_super_admin', { user_uuid: session.user.id });

      const isSuper = !superAdminError && !!superAdminCheck;
      setIsSuperAdmin(isSuper);

      if (isSuper) {
        // Super admin : récupérer toutes les organisations
        const { data: allOrgs, error: allOrgsError } = await supabase
          .rpc('get_all_organizations');

        if (allOrgsError) {
          console.error('Erreur lors de la récupération de toutes les organisations:', allOrgsError);
          setOrganizations([]);
        } else {
          setOrganizations(allOrgs || []);
        }
        
        setCurrentOrganization(null); // Super admin commence avec "Toutes les organisations"
        
        setIsOrganizationAdmin(false);
      } else {
        // Utilisateur normal : récupérer ses organisations
        const { data: userOrgs, error: orgsError } = await supabase
          .rpc('get_user_organizations', { user_uuid: session.user.id });

        if (orgsError) {
          console.error('Erreur lors de la récupération des organisations:', orgsError);
          setOrganizations([]);
          setCurrentOrganization(null);
          setIsOrganizationAdmin(false);
        } else {
          setOrganizations(userOrgs || []);
          
          // Définir l'organisation courante
          if (userOrgs && userOrgs.length > 0) {
            // Si une seule organisation, la sélectionner automatiquement
            // Si plusieurs organisations, commencer avec "Toutes mes organisations" (null)
            if (userOrgs.length === 1) {
              setCurrentOrganization(userOrgs[0]);
              setIsOrganizationAdmin(userOrgs[0].role === 'organization_admin');
            } else {
              setCurrentOrganization(null); // "Toutes mes organisations"
              // Vérifier si admin dans au moins une organisation
              const isAdminInAny = userOrgs.some(org => org.role === 'organization_admin');
              setIsOrganizationAdmin(isAdminInAny);
            }
          } else {
            setCurrentOrganization(null);
            setIsOrganizationAdmin(false);
          }
        }
      }

    } catch (error) {
      console.error('Erreur lors du refresh des données utilisateur:', error);
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  };

  // Fonction pour changer d'organisation avec sauvegarde en cookie
  const setCurrentOrganizationWithCookie = (org: UserOrganization | null) => {
    setCurrentOrganization(org);
    
    if (org) {
      // Sauvegarder l'ID de l'organisation sélectionnée
      setCookie('selectedOrganization', org.organization_id, { 
        path: '/', 
        maxAge: 30 * 24 * 60 * 60 // 30 jours
      });
    } else {
      // Si null (Toutes les organisations pour super admin), supprimer le cookie
      removeCookie('selectedOrganization', { path: '/' });
    }
  };

  // Restaurer l'organisation depuis le cookie quand les organisations sont chargées
  useEffect(() => {
    if (organizations.length > 0 && cookies.selectedOrganization) {
      const savedOrg = organizations.find(org => org.organization_id === cookies.selectedOrganization);
      if (savedOrg && !currentOrganization) {
        setCurrentOrganization(savedOrg);
      }
    }
  }, [organizations, cookies.selectedOrganization, currentOrganization]);

  useEffect(() => {
    refreshUserData();
  }, []); // Ne se déclenche qu'au montage initial

  useEffect(() => {
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        await refreshUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  // Rafraîchir les rôles quand l'organisation courante change
  useEffect(() => {
    if (user && currentOrganization) {
      const checkOrgAdmin = async () => {
        const { data: orgAdminCheck, error } = await supabase
          .rpc('is_organization_admin', { 
            user_uuid: user.id,
            org_uuid: currentOrganization.organization_id 
          });

        if (!error) {
          setIsOrganizationAdmin(orgAdminCheck || false);
        }
      };

      checkOrgAdmin();
    }
  }, [currentOrganization, user]);

  return {
    user,
    isLoading,
    organizations,
    currentOrganization,
    isSuperAdmin,
    isOrganizationAdmin,
    setCurrentOrganization: setCurrentOrganizationWithCookie,
    refreshUserData,
  };
};
