import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Shield, UserX, UserCheck, BookOpen, Users, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  const isSuperAdmin = localStorage.getItem('role') === 'SUPER_ADMIN';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: isSuperAdmin ? 'HOD' : 'STUDENT', password: '', department_id: '' });
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { params: { search, role: roleFilter } });
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    if (isSuperAdmin) {
      try {
        const res = await api.get('/admin/departments');
        setDepartments(res.data);
      } catch (e) {
        console.error("Error fetching departments", e);
      }
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [isSuperAdmin]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, roleFilter]);

  const toggleStatus = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/toggle-status`);
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: isSuperAdmin ? 'HOD' : 'LECTURER', password: '', department_id: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role, password: '', department_id: user.department?.id || '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate if HOD needs department
    if (isSuperAdmin && formData.role === 'HOD' && !formData.department_id) {
      alert("Please select a department for the HOD.");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await api.patch(`/admin/users/${editingUser.id}`, { name: formData.name, email: formData.email, role: formData.role, department_id: formData.department_id });
      } else {
        await api.post('/admin/users', formData);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (e) {
      console.error(e);
      alert('Error saving user. Ensure email is unique and password is at least 6 characters.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'SUPER_ADMIN': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: '#475569' }}><Shield size={14} color="var(--primary-color)"/> Admin</span>;
      case 'HOD': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: '#475569' }}><Shield size={14} color="var(--primary-color)"/> HOD</span>;
      case 'LECTURER': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: '#475569' }}><BookOpen size={14} color="var(--text-secondary)"/> Lecturer</span>;
      case 'PARENT': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: '#475569' }}><Users size={14} color="var(--text-secondary)"/> Parent</span>;
      default: return null;
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h4 style={{ fontWeight: 700 }}>{isSuperAdmin ? 'Manage Users' : 'Department Lecturers & Staff'}</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            {isSuperAdmin ? 'Manage all system accounts' : `Staff assigned to ${localStorage.getItem('department') || 'Tourism'} Department`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ padding: '0.4rem 1rem 0.4rem 2.5rem', height: '40px', fontSize: '0.875rem' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Filter size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field"
              style={{ padding: '0.4rem 1rem 0.4rem 2.5rem', height: '40px', fontSize: '0.875rem', cursor: 'pointer', appearance: 'auto', minWidth: '150px' }}
            >
              <option value="">All Roles</option>
              {isSuperAdmin && <option value="SUPER_ADMIN">Admin</option>}
              {isSuperAdmin && <option value="HOD">HOD</option>}
              {!isSuperAdmin && <option value="LECTURER">Lecturer</option>}
              {!isSuperAdmin && <option value="PARENT">Parent</option>}
            </select>
          </div>
          <button onClick={openAddModal} className="btn btn-primary" style={{ padding: '0 1.5rem', height: '40px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Add User
          </button>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Email</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Role</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No users found.</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>{getRoleBadge(u.role)}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: u.status === 'ACTIVE' ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => openEditModal(u)}
                        style={{ padding: '0.25rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} 
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => toggleStatus(u.id)}
                        style={{ padding: '0.25rem', background: 'none', border: 'none', color: u.status === 'ACTIVE' ? 'var(--error-color)' : 'var(--success-color)', cursor: 'pointer' }} 
                        title={u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        {u.status === 'ACTIVE' ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.25rem' }}>{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">Full Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">Email Address</label>
                <input 
                  type="email" 
                  className="input-field" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">Role</label>
                <select 
                  className="input-field" 
                  style={{ appearance: 'auto', cursor: 'pointer' }}
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  {isSuperAdmin && <option value="SUPER_ADMIN">Admin</option>}
                  {isSuperAdmin && <option value="HOD">HOD</option>}
                  {!isSuperAdmin && <option value="LECTURER">Lecturer</option>}
                  {!isSuperAdmin && <option value="PARENT">Parent</option>}
                </select>
              </div>

              {isSuperAdmin && formData.role === 'HOD' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="input-label">Assign to Department</label>
                  <select 
                    className="input-field" 
                    style={{ appearance: 'auto', cursor: 'pointer' }}
                    value={formData.department_id}
                    onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                    required
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {!editingUser && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="input-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="input-field" 
                      required 
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn" style={{ flex: 1, backgroundColor: '#F1F5F9', color: 'var(--text-primary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                  {saving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
