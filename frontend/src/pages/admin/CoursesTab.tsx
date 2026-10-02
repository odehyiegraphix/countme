import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Book, Trash2 } from 'lucide-react';
import api from '../../lib/api';

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  credit_hours: number;
  department?: { id: string; name: string };
  offerings_count: number;
}

export default function CoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    credit_hours: 3,
    level: 100,
    semester: 1
  });
  const [saving, setSaving] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/courses');
      setCourses(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCourseId) {
        await api.patch(`/admin/courses/${editingCourseId}`, formData);
      } else {
        await api.post('/admin/courses', formData);
      }
      setIsModalOpen(false);
      setEditingCourseId(null);
      setFormData({ course_code: '', course_name: '', credit_hours: 3, level: 100, semester: 1 });
      fetchCourses();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error saving course');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourseId(course.id);
    setFormData({
      course_code: course.course_code,
      course_name: course.course_name,
      credit_hours: course.credit_hours,
      level: (course as any).level || 100,
      semester: (course as any).semester || 1
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.delete(`/admin/courses/${id}`);
      fetchCourses();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error deleting course');
    }
  };


  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontWeight: 700 }}>Courses</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Curriculum offerings for {localStorage.getItem('department') || 'Tourism'} Department
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingCourseId(null);
            setFormData({ course_code: '', course_name: '', credit_hours: 3, level: 100, semester: 1 });
            setIsModalOpen(true);
          }}
          className="btn btn-primary" 
          style={{ padding: '0 1.5rem', height: '40px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> Add Course
        </button>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Course Code</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Course Name</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Level / Sem</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Department</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Credits</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Offerings</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading courses...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No courses found.</td></tr>
            ) : (
              courses.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                    <span style={{ backgroundColor: '#E0F2FE', color: 'var(--primary-color)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem' }}>{c.course_code}</span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{c.course_name}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>L{c.level || 100} / S{c.semester || 1}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{c.department?.name || '—'}</td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>{c.credit_hours}</td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>{c.offerings_count}</td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => openEditModal(c)} style={{ padding: '0.25rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} style={{ padding: '0.25rem', background: 'none', border: 'none', color: 'var(--danger-color, #ef4444)', cursor: 'pointer' }} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.25rem' }}>{editingCourseId ? 'Edit Course' : 'Add New Course'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">Course Code</label>
                <input type="text" className="input-field" required 
                  value={formData.course_code} onChange={e => setFormData({...formData, course_code: e.target.value})} 
                  placeholder="e.g. CS101" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">Course Name</label>
                <input type="text" className="input-field" required 
                  value={formData.course_name} onChange={e => setFormData({...formData, course_name: e.target.value})} 
                  placeholder="e.g. Introduction to Programming" />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="input-label">Level</label>
                  <select className="input-field" value={formData.level} onChange={e => setFormData({...formData, level: parseInt(e.target.value)})} style={{ appearance: 'auto', cursor: 'pointer' }}>
                    <option value="100">Level 100</option>
                    <option value="200">Level 200</option>
                    <option value="300">Level 300</option>
                    <option value="400">Level 400</option>
                    <option value="500">Level 500</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Semester</label>
                  <select className="input-field" value={formData.semester} onChange={e => setFormData({...formData, semester: parseInt(e.target.value)})} style={{ appearance: 'auto', cursor: 'pointer' }}>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="input-label">Credit Hours</label>
                <input type="number" min="1" max="12" className="input-field" required 
                  value={formData.credit_hours} onChange={e => setFormData({...formData, credit_hours: parseInt(e.target.value)})} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn" style={{ flex: 1, backgroundColor: '#F1F5F9', color: 'var(--text-primary)' }}>Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>{saving ? 'Saving...' : 'Save Course'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
