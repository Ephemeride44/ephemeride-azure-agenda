import React, { createContext, useContext, ReactNode } from 'react';
import { useUserRole, UserContext } from '@/hooks/use-user-role';

const UserRoleContext = createContext<UserContext | undefined>(undefined);

interface UserRoleProviderProps {
  children: ReactNode;
}

export const UserRoleProvider: React.FC<UserRoleProviderProps> = ({ children }) => {
  const userRoleData = useUserRole();

  return (
    <UserRoleContext.Provider value={userRoleData}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRoleContext = (): UserContext => {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRoleContext must be used within a UserRoleProvider');
  }
  return context;
};
