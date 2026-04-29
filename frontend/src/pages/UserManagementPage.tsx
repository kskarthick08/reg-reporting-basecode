import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { User, Role } from '@/types';
import { formatDate } from '@/utils/formatters';
import axios from '@/utils/axios';
import { UserPlus, Edit2, Trash2, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import '@/components/css/UserManagementPage.css';

export const UserManagementPage = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; username: string } | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    role: '',
    password: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // Get available roles based on current user's role
  const getAvailableRoles = (): Role[] => {
    const currentUserRole = currentUser?.role?.name;

    // Super User can create all persona types (Admin, BA, Developer, Analyst)
    // Super User role itself is never shown in the list
    if (currentUserRole === 'Super User') {
      return roles.filter(role => role.name !== 'Super User');
    }

    // Admin can create all roles except Super User (Super User never shown to anyone)
    if (currentUserRole === 'Admin') {
      return roles.filter(role => role.name !== 'Super User');
    }

    // Other users: Never show Super User role to anyone
    return roles.filter(role => role.name !== 'Super User');
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/auth/admin/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get('/auth/admin/roles');
      setRoles(response.data.roles || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      setRoles([]);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormData({ username: '', email: '', full_name: '', role: '', password: '' });
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name || '',
      role: user.role?.name || '',
      password: '',
    });
    setDialogOpen(true);
  };

  const handleSaveUser = async () => {
    const toastId = showToast.loading(selectedUser ? 'Updating user...' : 'Creating user...');

    try {
      if (selectedUser) {
        await axios.put(`/auth/admin/users/${selectedUser.id}`, formData);
        showToast.dismiss(toastId);
        showToast.success('User updated successfully!');
      } else {
        await axios.post('/auth/admin/users', formData);
        showToast.dismiss(toastId);
        showToast.success('User created successfully!');
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      showToast.dismiss(toastId);

      // Handle validation errors (422)
      let errorMessage = 'Failed to save user';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Pydantic validation errors
          errorMessage = detail.map((err: any) => err.msg || err).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail);
        }
      }

      showToast.error(errorMessage);
    }
  };

  const handleDeleteClick = (userId: string, username: string) => {
    setUserToDelete({ id: userId, username });
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    const toastId = showToast.loading('Deleting user...');

    try {
      await axios.delete(`/auth/admin/users/${userToDelete.id}`);
      showToast.dismiss(toastId);
      showToast.success('User deleted successfully!');
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      showToast.dismiss(toastId);
      showToast.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className="user-page-container">
      
        <div className="user-header-section">
          <div>
            <h1 className="user-main-title">User Management</h1>
            <p className="user-subtitle">Manage system users and their permissions</p>
          </div>
          <button
            onClick={handleAddUser}
            className="user-add-btn"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>

        <Card className="user-table-card">
          <CardContent className="user-table-content">
            <div className="user-table-wrapper">
              <table className="user-table">
                <thead className="user-table-head">
                  <tr>
                    <th className="user-th">Username</th>
                    <th className="user-th">Email</th>
                    <th className="user-th">Role</th>
                    <th className="user-th">Created</th>
                    <th className="user-th">Actions</th>
                  </tr>
                </thead>
                <tbody className="user-table-body">
                  {users.map((user) => (
                    <tr key={user.id} className="user-table-row">
                      <td className="user-td">{user.username}</td>
                      <td className="user-td">{user.email}</td>
                      <td className="user-td">
                        <span
                          className={`user-role-badge ${
                            user.role?.name === 'Super User'
                              ? 'user-role-badge-super'
                              : user.role?.name === 'Admin'
                              ? 'user-role-badge-admin'
                              : 'user-role-badge-user'
                          }`}
                          title={user.role?.description || ''}
                        >
                          {user.role?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="user-td">{formatDate(user.created_at)}</td>
                      <td className="user-td">
                        <div className="user-actions">
                          <button
                            className="user-action-btn"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            className="user-delete-btn"
                            onClick={() => handleDeleteClick(user.id, user.username)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="user-empty-state">
                  <p className="user-empty-text">No users found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Custom User Modal */}
        {dialogOpen && (
          <div className="user-modal-overlay" onClick={() => setDialogOpen(false)}>
            <div className="user-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="user-modal-header">
                <h2 className="user-modal-title">
                  {selectedUser ? 'Edit User' : 'Add New User'}
                </h2>
                <button
                  onClick={() => setDialogOpen(false)}
                  className="user-modal-close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                className="user-modal-body"
                onSubmit={e => {
                  e.preventDefault();
                  handleSaveUser();
                }}
              >
                <div className="user-form-group">
                  <Label htmlFor="username" className="user-form-label">
                    Username
                  </Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={e =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="user-form-input"
                    required
                  />
                </div>

                <div className="user-form-group">
                  <Label htmlFor="email" className="user-form-label">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={e =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="user-form-input"
                    required
                  />
                </div>

                <div className="user-form-group">
                  <Label htmlFor="full_name" className="user-form-label">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={e =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="user-form-input"
                    placeholder="Optional"
                  />
                </div>

                <div className="user-form-group">
                  <Label htmlFor="role" className="user-form-label">
                    Role
                  </Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={e =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="user-select"
                    required
                  >
                    <option value="">Select a role</option>
                    {getAvailableRoles().map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {formData.role && (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {roles.find(r => r.name === formData.role)?.description}
                    </p>
                  )}
                </div>

                <div className="user-form-group">
                  <Label htmlFor="password" className="user-form-label">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={e =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={
                      selectedUser
                        ? 'Leave blank to keep current password'
                        : 'Enter password'
                    }
                    className="user-form-input"
                    autoComplete="new-password"
                  />
                </div>

                <div className="user-modal-footer">
                  <button
                    type="button"
                    onClick={() => setDialogOpen(false)}
                    className="user-btn-cancel"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="user-btn-save">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete user "${userToDelete?.username}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
