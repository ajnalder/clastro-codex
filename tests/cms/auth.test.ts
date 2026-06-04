import { describe, expect, it } from 'vitest';
import {
  canInviteRole,
  createSiteAccessView,
  getRoleLabel,
  type CmsUserRole,
} from '../../src/cms/auth';

const users = [
  {
    userId: 'andrew',
    name: 'Andrew Nalder',
    email: 'andrew@example.com',
    role: 'superAdmin' as CmsUserRole,
    status: 'active' as const,
    visibleToClient: true,
  },
  {
    userId: 'owner',
    name: 'Joe Owner',
    email: 'owner@example.com',
    role: 'siteOwner' as CmsUserRole,
    status: 'active' as const,
    visibleToClient: true,
  },
  {
    userId: 'editor',
    name: 'Emma Editor',
    email: 'editor@example.com',
    role: 'editor' as CmsUserRole,
    status: 'invited' as const,
    visibleToClient: true,
  },
];

describe('CMS auth and site access', () => {
  it('labels the super admin as visible support access', () => {
    const access = createSiteAccessView(users, 'andrew');

    expect(access.currentUser?.name).toBe('Andrew Nalder');
    expect(access.currentUser?.roleLabel).toBe('Super admin');
    expect(access.users.find((user) => user.userId === 'andrew')).toEqual(expect.objectContaining({
      accessLabel: 'Visible support access',
      roleLabel: 'Super admin',
    }));
  });

  it('allows owners to invite editors and collaborators but not owners or super admins', () => {
    expect(canInviteRole('siteOwner', 'editor')).toBe(true);
    expect(canInviteRole('siteOwner', 'collaborator')).toBe(true);
    expect(canInviteRole('siteOwner', 'siteOwner')).toBe(false);
    expect(canInviteRole('siteOwner', 'superAdmin')).toBe(false);
  });

  it('prevents editors and collaborators from managing users', () => {
    expect(canInviteRole('editor', 'collaborator')).toBe(false);
    expect(canInviteRole('collaborator', 'editor')).toBe(false);
  });

  it('keeps role labels human-readable', () => {
    expect(getRoleLabel('siteOwner')).toBe('Site owner');
    expect(getRoleLabel('collaborator')).toBe('Collaborator');
  });
});
