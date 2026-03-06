'use client';

import { RouteGuard , PermissionGate, RoleGate } from '@/client/components/auth';
import { usePermissions } from '@/client/hooks/use-permissions';
import { useAuth } from '@/client/lib/auth-context';

function DashboardContent() {
  const { user, logout } = useAuth();
  const { roles, permissions, loading } = usePermissions();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={() => void logout()}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
            >
              Sign out
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Welcome, {user?.name ?? user?.email}</h2>
            <p className="text-gray-500">You are logged in as {user?.email}</p>
          </div>

          {/* Show user's roles and permissions */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded p-4">
                <h3 className="font-medium text-gray-700 mb-2">Your Roles</h3>
                {roles.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {roles.map((role) => (
                      <li key={role}>{role}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No roles assigned</p>
                )}
              </div>

              <div className="bg-gray-50 rounded p-4">
                <h3 className="font-medium text-gray-700 mb-2">Your Permissions</h3>
                {permissions.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-gray-600 max-h-32 overflow-y-auto">
                    {permissions.map((perm) => (
                      <li key={perm}>{perm}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No permissions granted</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Permission-gated content examples */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Permission-Gated Content</h2>

          <div className="space-y-4">
            <PermissionGate
              require="admin:access:all"
              fallback={
                <div className="bg-gray-100 rounded p-4 text-gray-500">
                  Admin panel (requires admin:access:all permission)
                </div>
              }
            >
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="font-medium text-green-800">Admin Panel</h3>
                <p className="text-sm text-green-600">
                  You have admin access! This content is only visible to admins.
                </p>
              </div>
            </PermissionGate>

            <PermissionGate
              require="users:manage:all"
              fallback={
                <div className="bg-gray-100 rounded p-4 text-gray-500">
                  User management (requires users:manage:all permission)
                </div>
              }
            >
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h3 className="font-medium text-blue-800">User Management</h3>
                <p className="text-sm text-blue-600">
                  You can manage users! This content is only visible to user managers.
                </p>
              </div>
            </PermissionGate>
          </div>
        </div>

        {/* Role-gated content examples */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Role-Gated Content</h2>

          <div className="space-y-4">
            <RoleGate
              require="Admin"
              fallback={
                <div className="bg-gray-100 rounded p-4 text-gray-500">
                  Admin-only section (requires Admin role)
                </div>
              }
            >
              <div className="bg-purple-50 border border-purple-200 rounded p-4">
                <h3 className="font-medium text-purple-800">Admin Section</h3>
                <p className="text-sm text-purple-600">
                  You have the Admin role! This content is only visible to Admins.
                </p>
              </div>
            </RoleGate>

            <RoleGate
              requireAny={['Developer', 'Admin']}
              fallback={
                <div className="bg-gray-100 rounded p-4 text-gray-500">
                  Dev tools (requires Developer or Admin role)
                </div>
              }
            >
              <div className="bg-orange-50 border border-orange-200 rounded p-4">
                <h3 className="font-medium text-orange-800">Developer Tools</h3>
                <p className="text-sm text-orange-600">
                  You have Developer or Admin access! This content is visible to both.
                </p>
              </div>
            </RoleGate>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RouteGuard>
      <DashboardContent />
    </RouteGuard>
  );
}
