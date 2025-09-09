import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUserRoleContext } from '@/components/UserRoleProvider';
import { Building2 } from 'lucide-react';

interface OrganizationSelectorProps {
  compact?: boolean;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ compact = false }) => {
  const { 
    organizations, 
    currentOrganization, 
    setCurrentOrganization, 
    isSuperAdmin 
  } = useUserRoleContext();

  if (organizations.length === 0) {
    return null;
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'organization_admin':
        return 'Admin';
      case 'organization_member':
        return 'Membre';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'organization_admin':
        return 'default';
      case 'organization_member':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Organisation</span>
        </div>
        
        <Select
          value={currentOrganization?.organization_id || 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              setCurrentOrganization(null);
            } else {
              const org = organizations.find(o => o.organization_id === value);
              setCurrentOrganization(org || null);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionner...">
              {currentOrganization ? (
                <span className="truncate">{currentOrganization.organization_name}</span>
              ) : !isSuperAdmin && organizations.length > 1 ? (
                <span className="truncate">Toutes mes organisations</span>
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {isSuperAdmin ? (
              <SelectItem value="all">
                <span className="font-medium">Toutes les organisations</span>
              </SelectItem>
            ) : organizations.length > 1 ? (
              <SelectItem value="all">
                <span className="font-medium">Toutes mes organisations</span>
              </SelectItem>
            ) : null}
            {organizations.map((org) => (
              <SelectItem key={org.organization_id} value={org.organization_id}>
                <div className="flex flex-col items-start">
                  <span className="truncate">{org.organization_name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm font-medium">Organisation</span>
      </div>
      
      <div className="flex-1">
        <Select
          value={currentOrganization?.organization_id || 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              setCurrentOrganization(null);
            } else {
              const org = organizations.find(o => o.organization_id === value);
              setCurrentOrganization(org || null);
            }
          }}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Sélectionner une organisation">
              {currentOrganization ? (
                <div className="flex items-center justify-between w-full">
                  <span>{currentOrganization.organization_name}</span>
                </div>
              ) : !isSuperAdmin && organizations.length > 1 ? (
                <div className="flex items-center justify-between w-full">
                  <span>Toutes mes organisations</span>
                </div>
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {isSuperAdmin ? (
              <SelectItem value="all">
                <span className="font-medium">Toutes les organisations</span>
              </SelectItem>
            ) : organizations.length > 1 ? (
              <SelectItem value="all">
                <span className="font-medium">Toutes mes organisations</span>
              </SelectItem>
            ) : null}
            {organizations.map((org) => (
              <SelectItem key={org.organization_id} value={org.organization_id}>
                <div className="flex items-center justify-between w-full">
                  <span>{org.organization_name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
