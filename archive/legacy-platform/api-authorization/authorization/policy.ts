export type Principal = {
  id: string;
  permissions: ReadonlySet<string>;
  organizationUnitIds: ReadonlySet<string>;
};
export type Resource = { ownerId?: string; organizationUnitId?: string };
export type Scope = 'OWN' | 'ORGANIZATION' | 'GLOBAL';

export const can = (
  principal: Principal,
  permission: string,
  scope: Scope,
  resource: Resource = {},
): boolean => {
  if (!principal.permissions.has(permission) && !principal.permissions.has('*')) return false;
  if (scope === 'GLOBAL') return true;
  if (scope === 'OWN') return resource.ownerId === principal.id;
  return (
    resource.organizationUnitId !== undefined &&
    principal.organizationUnitIds.has(resource.organizationUnitId)
  );
};
