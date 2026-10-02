import React, { useState, useEffect } from 'react';
import { Users, Upload, Plus, Search, Trash2 } from 'lucide-react';
import api from '../../lib/api';

interface Student {
  id: string;
  name: string;
  index_number: string;
  level: number;
}

export default function StudentsTab() {
  const [level, setLevel] = useState('100');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/students', { params: { search } });
      setStudents(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('level', level);

    setUploading(true);
    try {
      await api.post('/admin/students/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Students uploaded successfully!');
      setFile(null);
      fetchStudents();
    } catch (e) {
      console.error(e);
      alert('Error uploading students');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
        <div>
          <h4 style={{ fontWeight: 700 }}>Students Management</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 1.25rem 0' }}>
            Enrolled students for {localStorage.getItem('department') || 'Tourism'} Department
          </p>
        </div>
        
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px dashed #CBD5E1' }}>
          <h5 style={{ fontWeight: 600, marginBottom: '1rem' }}>Upload Class List (CSV)</h5>
          <form onSubmit={handleUpload} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="input-label">Select Level</label>
              <select 
                className="input-field" 
                value={level} 
                onChange={(e) => setLevel(e.target.value)}
                style={{ width: '150px', appearance: 'auto', cursor: 'pointer' }}
              >
                <option value="100">Level 100</option>
                <option value="200">Level 200</option>
                <option value="300">Level 300</option>
                <option value="400">Level 400</option>
                <option value="500">Level 500</option>
              </select>
            </div>
            
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label className="input-label">CSV File</label>
              <input 
                type="file" 
                accept=".csv"
                className="input-field" 
                style={{ paddingTop: '0.6rem' }}
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                required
              />
            </div>

            <button type="submit" disabled={uploading || !file} className="btn btn-primary" style={{ height: '50px' }}>
              <Upload size={18} style={{ marginRight: '0.5rem' }} />
              {uploading ? 'Uploading...' : 'Upload Students'}
            </button>
          </form>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            CSV should contain columns: <code>name</code>, <code>index_number</code>.
          </p>
        </div>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h5 style={{ fontWeight: 600 }}>Enrolled Students</h5>
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search name or index..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ padding: '0.4rem 1rem 0.4rem 2.5rem', height: '40px', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Index Number</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Level</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>Loading students...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>No students found. Upload a CSV above to get started.</td></tr>
            ) : (
              students.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>{s.index_number}</td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      Level {s.level}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
