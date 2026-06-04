export type CmsUserRole = 'superAdmin' | 'siteOwner' | 'editor' | 'collaborator';
export type CmsUserStatus = 'active' | 'invited' | 'disabled';

export interface CmsUserAccount {
  userId: string;
  name: string;
  email: string;
  role: CmsUserRole;
  status: CmsUserStatus;
  visibleToClient: boolean;
}

export interface CmsUserAccessView extends CmsUserAccount {
  roleLabel: string;
  accessLabel: string;
  canBeManagedByCurrentUser: boolean;
}

export interface CmsSiteAccessView {
  currentUser: CmsUserAccessView | null;
  users: CmsUserAccessView[];
  canManageUsers: boolean;
  inviteRoles: CmsUserRole[];
}

const roleLabels: Record<CmsUserRole, string> = {
  superAdmin: 'Super admin',
  siteOwner: 'Site owner',
  editor: 'Editor',
  collaborator: 'Collaborator',
};

const clientInviteRoles: CmsUserRole[] = ['editor', 'collaborator'];
const superAdminInviteRoles: CmsUserRole[] = ['siteOwner', 'editor', 'collaborator'];

export function getRoleLabel(role: CmsUserRole): string {
  return roleLabels[role];
}

export function canInviteRole(actorRole: CmsUserRole, targetRole: CmsUserRole): boolean {
  if (actorRole === 'superAdmin') {
    return superAdminInviteRoles.includes(targetRole);
  }
  if (actorRole === 'siteOwner') {
    return clientInviteRoles.includes(targetRole);
  }
  return false;
}

function createAccessLabel(user: CmsUserAccount): string {
  if (user.role === 'superAdmin') {
    return user.visibleToClient ? 'Visible support access' : 'Hidden support access';
  }
  if (user.role === 'siteOwner') {
    return 'Client owner';
  }
  return 'Client user';
}

function canManageUser(actor: CmsUserAccount | null, target: CmsUserAccount): boolean {
  if (!actor || actor.userId === target.userId) {
    return false;
  }
  if (actor.role === 'superAdmin') {
    return target.role !== 'superAdmin';
  }
  if (actor.role === 'siteOwner') {
    return target.role === 'editor' || target.role === 'collaborator';
  }
  return false;
}

export function createSiteAccessView(users: CmsUserAccount[], currentUserId: string): CmsSiteAccessView {
  const currentUserAccount = users.find((user) => user.userId === currentUserId) ?? null;
  const visibleUsers = users.filter((user) => user.visibleToClient || user.userId === currentUserId);
  const accessUsers = visibleUsers.map((user) => ({
    ...user,
    roleLabel: getRoleLabel(user.role),
    accessLabel: createAccessLabel(user),
    canBeManagedByCurrentUser: canManageUser(currentUserAccount, user),
  }));
  const currentUser = accessUsers.find((user) => user.userId === currentUserId) ?? null;

  return {
    currentUser,
    users: accessUsers,
    canManageUsers: Boolean(currentUserAccount && (currentUserAccount.role === 'superAdmin' || currentUserAccount.role === 'siteOwner')),
    inviteRoles: currentUserAccount
      ? (['siteOwner', 'editor', 'collaborator'] as CmsUserRole[]).filter((role) => canInviteRole(currentUserAccount.role, role))
      : [],
  };
}
