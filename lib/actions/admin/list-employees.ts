'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import { createAdminClient } from '@/lib/db/admin';

export interface EmployeeRole {
  id: string;
  name: string;
  display_name: string;
}

export interface Employee {
  id: string;
  full_name: string;
  email: string | null;
  employee_code: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  roles: EmployeeRole[];
}

export type ListEmployeesResult =
  | { success: true; employees: Employee[] }
  | { success: false; error: string };

export async function listEmployees(): Promise<ListEmployeesResult> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: authContext, error: authContextError } = await supabase.rpc('get_my_auth_context');
  if (authContextError || !authContext) {
    return { success: false, error: 'Failed to resolve auth context' };
  }

  const userPermissions: Permission[] = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : [];
  if (!userPermissions.includes(PERMISSIONS.ADMIN.USER_READ)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const adminClient = createAdminClient();

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, full_name, employee_code, phone, is_active, created_at')
    .order('full_name', { ascending: true });

  if (profilesError) {
    return { success: false, error: 'Failed to fetch employees' };
  }

  if (!profiles || profiles.length === 0) {
    return { success: true, employees: [] };
  }

  const profileIds = profiles.map((p) => p.id);

  const { data: userRolesData, error: rolesError } = await adminClient
    .from('user_roles')
    .select('user_id, role_id, roles!inner(id, name, display_name)')
    .in('user_id', profileIds);

  if (rolesError) {
    return { success: false, error: 'Failed to fetch roles' };
  }

  const rolesByUserId = new Map<string, EmployeeRole[]>();

for (const ur of userRolesData ?? []) {
  const role = ur.roles as unknown as {
    id: string;
    name: string;
    display_name: string;
  } | null;

  if (!role) {
    continue;
  }

  const existing = rolesByUserId.get(ur.user_id) ?? [];

  existing.push({
    id: role.id,
    name: role.name,
    display_name: role.display_name,
  });

  rolesByUserId.set(ur.user_id, existing);
}
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  const emailById = new Map<string, string>();
  for (const u of authUsers?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  const employees: Employee[] = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: emailById.get(p.id) ?? null,
    employee_code: p.employee_code,
    phone: p.phone,
    is_active: p.is_active,
    created_at: p.created_at,
    roles: rolesByUserId.get(p.id) ?? [],
  }));

  return { success: true, employees };
}
