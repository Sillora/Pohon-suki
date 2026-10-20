'use client';

import { useEffect, useState, useRef } from 'react';
import Matter from 'matter-js';
import pohonImg from '../image/pohon.png';
import grassImg from '../image/grass.jpg';
import skyImg from '../image/sky.jpg'; // <-- 1. TAMBAHKAN IMPORT INI

const emptyForm = { name: '', description: '', price: '' };

export default function Home() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [isShaking, setIsShaking] = useState(false);
  
  const sceneRef = useRef(null);
  const engineRef = useRef(null);

  // ... (Fungsi loadProducts, useEffect Fisika, dan useEffect Tambah Apel biarkan sama seperti sebelumnya) ...
  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat data');
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    const Engine = Matter.Engine, Runner = Matter.Runner, Bodies = Matter.Bodies, Composite = Matter.Composite, Mouse = Matter.Mouse, MouseConstraint = Matter.MouseConstraint;
    const engine = Engine.create();
    engineRef.current = engine;
    const world = engine.world;
    const width = sceneRef.current.clientWidth;
    const height = sceneRef.current.clientHeight;
    const ground = Bodies.rectangle(width / 2, height + 20, width * 2, 40, { isStatic: true, friction: 0.8 });
    const leftWall = Bodies.rectangle(-20, height / 2, 40, height * 2, { isStatic: true });
    const rightWall = Bodies.rectangle(width + 20, height / 2, 40, height * 2, { isStatic: true });
    Composite.add(world, [ground, leftWall, rightWall]);
    const mouse = Mouse.create(sceneRef.current);
    const mouseConstraint = MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0, render: { visible: false } } });
    Composite.add(world, mouseConstraint);
    let holdTimer = null; let clickedBody = null; let isDragging = false;
    Matter.Events.on(mouseConstraint, 'mousedown', (e) => {
      clickedBody = mouseConstraint.body;
      if (clickedBody) {
        isDragging = false;
        holdTimer = setTimeout(() => {
          isDragging = true;
          mouseConstraint.constraint.stiffness = 0.2;
          if (sceneRef.current) sceneRef.current.style.cursor = 'grabbing';
        }, 200);
      }
    });
    Matter.Events.on(mouseConstraint, 'mouseup', (e) => {
      clearTimeout(holdTimer);
      if (clickedBody) {
        if (!isDragging) {
          if (clickedBody.plugin && clickedBody.plugin.data) setSelectedProduct(clickedBody.plugin.data);
        }
      }
      isDragging = false; clickedBody = null; mouseConstraint.constraint.stiffness = 0;
      if (sceneRef.current) sceneRef.current.style.cursor = 'default';
    });
    const runner = Runner.create();
    Runner.run(runner, engine);
    Matter.Events.on(engine, 'afterUpdate', () => {
      const bodies = Composite.allBodies(world).filter(b => b.plugin && b.plugin.data);
      bodies.forEach(body => {
        const el = document.getElementById(`apple-${body.plugin.data.id}`);
        if (el) el.style.transform = `translate(${body.position.x - 20}px, ${body.position.y - 20}px) rotate(${body.angle}rad)`;
      });
    });
    return () => { Runner.stop(runner); Engine.clear(engine); Matter.Events.off(engine, 'afterUpdate'); };
  }, []);

  useEffect(() => {
    if (!engineRef.current || !sceneRef.current) return;
    const Bodies = Matter.Bodies, Composite = Matter.Composite, world = engineRef.current.world;
    const currentBodies = Composite.allBodies(world).filter(b => b.plugin && b.plugin.data);
    const currentIds = products.map(p => p.id);
    currentBodies.forEach(b => { if (!currentIds.includes(b.plugin.data.id)) Composite.remove(world, b); });
    products.forEach((p) => {
      const exists = currentBodies.find(b => b.plugin.data.id === p.id);
      if (!exists) {
        const randomX = (sceneRef.current.clientWidth / 2) + (Math.random() - 0.5) * 150;
        const appleBody = Bodies.circle(randomX, -50, 20, { restitution: 0.6, friction: 0.5, density: 0.04, plugin: { data: p } });
        Composite.add(world, appleBody);
      }
    });
  }, [products]);

  function handleChange(e) { const { name, value } = e.target; setForm((prev) => ({ ...prev, [name]: value })); }
  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setError(''); setIsShaking(true); setTimeout(() => setIsShaking(false), 500);
    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data');
      setForm(emptyForm); setEditingId(null); setSelectedProduct(null); await loadProducts();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function handleDelete(id) {
    if (!confirm('Yakin ingin memetik (menghapus) apel ini?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus data');
      setSelectedProduct(null); await loadProducts();
    } catch (err) { alert(err.message); }
  }
  function triggerEdit(product) {
    setEditingId(product.id); setForm({ name: product.name, description: product.description || '', price: product.price });
    setSelectedProduct(null); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="main-container">
      <div className="header-title">
        <h1> Pohon Suki</h1>
        <p className="subtitle">Website CRUD</p>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="layout-grid">
        <div className="card form-card">
          <h3>{editingId ? 'Edit Apel' : 'Tanam Apel Baru'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label>Nama Produk</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="Misal: Apel Merah" />
            </div>
            <div className="form-row">
              <label>Deskripsi</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Deskripsi..." />
            </div>
            <div className="form-row">
              <label>Harga (Rp)</label>
              <input name="price" type="number" value={form.price} onChange={handleChange} required placeholder="0" />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Menanam...' : editingId ? 'Simpan Perubahan' : 'Tanam Apel'}
              </button>
              {editingId && (
                <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 2. TAMBAHKAN STYLE BACKGROUND SKY DI SINI */}
        <div 
          className="tree-scene"
          style={{
            backgroundImage: `url(${skyImg.src})`,
            backgroundSize: '100%',
            backgroundPosition: 'top',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <img src={pohonImg.src} alt="Pohon Apel" className={`tree-graphic ${isShaking ? 'shake' : ''}`} />
          
          <div className="physics-canvas" ref={sceneRef} style={{ backgroundImage: `url(${grassImg.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {loading && <p style={{ textAlign: 'center', marginTop: '50px', color: '#fff', textShadow: '1px 1px 2px #000' }}>Memuat kebun...</p>}
            {!loading && products.length === 0 && (
              <p style={{ textAlign: 'center', marginTop: '50px', color: '#fff', textShadow: '1px 1px 2px #000' }}>Belum ada apel. Silakan tanam!</p>
            )}
            {products.map((p) => (
              <div key={p.id} id={`apple-${p.id}`} className="apple">🍎</div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabel (Biarkan sama seperti sebelumnya) */}
      <div className="table-container">
        <h2> Daftar Data Produk</h2>
        <table>
          <thead>
            <tr><th>Nama Produk</th><th>Deskripsi</th><th>Harga</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="empty-table">Memuat data...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan="4" className="empty-table">Belum ada data produk.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: '#64748b' }}>{p.description || '-'}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>Rp {Number(p.price).toLocaleString('id-ID')}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-table-edit" onClick={() => triggerEdit(p)}>Edit</button>
                      <button className="btn-table-danger" onClick={() => handleDelete(p.id)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal (Biarkan sama seperti sebelumnya) */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Apel</h2>
              <button className="close-btn" onClick={() => setSelectedProduct(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="apple-icon-large">🍎</div>
              <h3>{selectedProduct.name}</h3>
              <p className="modal-desc">{selectedProduct.description || 'Tidak ada deskripsi.'}</p>
              <p className="modal-price">Rp {Number(selectedProduct.price).toLocaleString('id-ID')}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-edit" onClick={() => triggerEdit(selectedProduct)}>Edit</button>
              <button className="btn-danger" onClick={() => handleDelete(selectedProduct.id)}>Petik (Hapus)</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}