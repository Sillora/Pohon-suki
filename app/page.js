'use client';

import { useEffect, useState, useRef } from 'react';
import Matter from 'matter-js';
import pohonImg from '../image/pohon.png';
import grassImg from '../image/grass.jpg';
import skyImg from '../image/sky.jpg';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  // Default diubah menjadi '1w'
  const [timeRange, setTimeRange] = useState('1w');
  
  const [form, setForm] = useState({ nominal: '', desc: '', tanggal: getTodayString() });
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [isShaking, setIsShaking] = useState(false);
  
  const sceneRef = useRef(null);
  const engineRef = useRef(null);

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

  // --- LOGIKA FISIKA MATTER.JS ---
  useEffect(() => {
    if (activeTab !== 'dashboard' || !sceneRef.current) return;
    
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
        const el = document.getElementById(`money-${body.plugin.data.id}`);
        if (el) el.style.transform = `translate(${body.position.x - 20}px, ${body.position.y - 20}px) rotate(${body.angle}rad)`;
      });
    });
    return () => { Runner.stop(runner); Engine.clear(engine); Matter.Events.off(engine, 'afterUpdate'); };
  }, [activeTab, products]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !engineRef.current || !sceneRef.current) return;
    const Bodies = Matter.Bodies, Composite = Matter.Composite, world = engineRef.current.world;
    const currentBodies = Composite.allBodies(world).filter(b => b.plugin && b.plugin.data);
    const currentIds = products.map(p => p.id);
    currentBodies.forEach(b => { if (!currentIds.includes(b.plugin.data.id)) Composite.remove(world, b); });
    products.forEach((p) => {
      const exists = currentBodies.find(b => b.plugin.data.id === p.id);
      if (!exists) {
        const randomX = (sceneRef.current.clientWidth / 2) + (Math.random() - 0.5) * 150;
        const moneyBody = Bodies.circle(randomX, -50, 20, { restitution: 0.6, friction: 0.5, density: 0.04, plugin: { data: p } });
        Composite.add(world, moneyBody);
      }
    });
  }, [products, activeTab]);


  // --- HANDLERS ---
  function handleChange(e) { const { name, value } = e.target; setForm((prev) => ({ ...prev, [name]: value })); }
  
  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setError(''); setIsShaking(true); setTimeout(() => setIsShaking(false), 500);
    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data');
      
      setForm({ nominal: '', desc: '', tanggal: getTodayString() }); 
      setEditingId(null); setSelectedProduct(null); await loadProducts();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Yakin ingin menghapus catatan tabungan ini?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus data');
      setSelectedProduct(null); await loadProducts();
    } catch (err) { alert(err.message); }
  }

  function triggerEdit(item) {
    setEditingId(item.id); 
    const safeTanggal = item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : getTodayString();
    setForm({ nominal: item.nominal || '', desc: item.desc || '', tanggal: safeTanggal });
    setSelectedProduct(null); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const totalTabungan = products.reduce((sum, item) => {
    const val = Number(item.nominal);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  // ==========================================
  // --- LOGIKA DATA UNTUK CHART (FIX TIMEZONE) ---
  // ==========================================
  const getLocalDateString = (dateStr) => {
    if (!dateStr) return '';
    const datePart = dateStr.split('T')[0];
    const [y, m, d] = datePart.split('-').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const getDateObject = (dateStr) => {
    const datePart = dateStr.split('T')[0];
    const [y, m, d] = datePart.split('-').map(Number);
    return new Date(y, m - 1, d); 
  };

  const getChartData = () => {
    const validProducts = products.filter(p => p.tanggal && p.tanggal !== '0000-00-00');
    if (validProducts.length === 0) return { labels: [], dataNominal: [] };

    validProducts.sort((a, b) => getDateObject(a.tanggal) - getDateObject(b.tanggal));
    const firstDepositDate = getDateObject(validProducts[0].tanggal);
    firstDepositDate.setHours(0,0,0,0);

    const today = new Date();
    today.setHours(0,0,0,0);

    let labels = [];
    let dataNominal = [];

    if (timeRange === '1y') {
      // Logika Tahunan (12 Bulan)
      const diffMonths = (today.getFullYear() - firstDepositDate.getFullYear()) * 12 + (today.getMonth() - firstDepositDate.getMonth());
      
      let startMonth = new Date(firstDepositDate.getFullYear(), firstDepositDate.getMonth(), 1);
      let endMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      if (diffMonths < 12) {
        endMonth = new Date(startMonth);
        endMonth.setMonth(startMonth.getMonth() + 11);
      } else {
        startMonth = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      }

      let current = new Date(startMonth);
      while (current <= endMonth) {
        labels.push(current.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));
        
        const monthTotal = validProducts.filter(p => {
          const d = getDateObject(p.tanggal);
          return d.getMonth() === current.getMonth() && d.getFullYear() === current.getFullYear();
        }).reduce((sum, p) => sum + (Number(p.nominal) || 0), 0);
        
        dataNominal.push(monthTotal);
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Logika Harian (1 Minggu = 7 Hari, 1 Bulan = 30 Hari)
      let daysLimit = 6; // 1 Minggu (7 hari termasuk hari ini)
      if (timeRange === '1m') daysLimit = 29; // 1 Bulan (30 hari termasuk hari ini)
      
      const diffTime = Math.abs(today - firstDepositDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let startDate = new Date(firstDepositDate);
      let endDate = new Date(firstDepositDate);

      if (diffDays <= daysLimit) {
        endDate.setDate(startDate.getDate() + daysLimit);
      } else {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - daysLimit);
        endDate = new Date(today);
      }

      let current = new Date(startDate);
      while (current <= endDate) {
        labels.push(current.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const dayTotal = validProducts.filter(p => getLocalDateString(p.tanggal) === dateStr)
                                       .reduce((sum, p) => sum + (Number(p.nominal) || 0), 0);
        
        dataNominal.push(dayTotal);
        current.setDate(current.getDate() + 1);
      }
    }

    return { labels, dataNominal };
  };

  const chartInfo = getChartData();

  const chartData = {
    labels: chartInfo.labels,
    datasets: [
      {
        label: 'Total Nabung (Rp)',
        data: chartInfo.dataNominal,
        backgroundColor: '#c9a050',
        borderColor: '#2c2c2c',
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
    ],
  };

  const maxData = Math.max(...chartInfo.dataNominal, 0);
  const suggestedMax = maxData > 0 ? Math.ceil(maxData * 1.3) : 10;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { family: 'Inter' } } },
      tooltip: {
        callbacks: {
          label: function(context) {
            return ' Rp ' + Number(context.raw).toLocaleString('id-ID');
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: suggestedMax,
        ticks: {
          precision: 0,
          callback: function(value) {
            return 'Rp ' + Number(value).toLocaleString('id-ID');
          }
        },
        grid: { color: '#e0e0e0' }
      },
      x: { 
        grid: { display: false },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 15
        }
      }
    }
  };

  return (
    <div className="app-wrapper">
      <aside className="sidebar">
        <div className="sidebar-brand"> Suki Tabungan</div>
        <ul className="sidebar-menu">
          <li>
            <a href="#" className={activeTab === 'dashboard' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
              💰 Dashboard Tabungan
            </a>
          </li>
          <li>
            <a href="#" className={activeTab === 'statistik' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('statistik'); }}>
              📊 Statistik
            </a>
          </li>
        </ul>
        <div className="sidebar-footer">&copy; 2026 Suki Financial</div>
      </aside>

      <main className="main-content">
        <div className="header-title">
          <h1>{activeTab === 'dashboard' ? 'Pohon Tabungan' : 'Statistik Tabungan'}</h1>
          <p className="subtitle">
            {activeTab === 'dashboard' 
              ? `Total Tabungan: Rp ${totalTabungan.toLocaleString('id-ID')}` 
              : 'Analisis aktivitas menabung Anda'}
          </p>
        </div>

        {error && <div className="error-box" style={{color: 'red', marginBottom: '20px'}}>{error}</div>}

        {/* --- TAMPILAN DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <>
            <div className="layout-grid">
              <div className="card form-card">
                <h3>{editingId ? 'Edit Catatan' : 'Catat Tabungan'}</h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <label>Tanggal</label>
                    <input type="date" name="tanggal" value={form.tanggal || getTodayString()} onChange={handleChange} required />
                  </div>
                  <div className="form-row">
                    <label>Nominal (Rp)</label>
                    <input type="number" name="nominal" value={form.nominal} onChange={handleChange} required placeholder="0" />
                  </div>
                  <div className="form-row">
                    <label>Keterangan</label>
                    <textarea name="desc" value={form.desc} onChange={handleChange} rows={3} placeholder="Misal: Nabung gajian..." />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tanam Uang'}
                    </button>
                    {editingId && (
                      <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm({ nominal: '', desc: '', tanggal: getTodayString() }); }}>
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="tree-scene" style={{ backgroundImage: `url(${skyImg.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <img src={pohonImg.src} alt="Pohon Tabungan" className={`tree-graphic ${isShaking ? 'shake' : ''}`} />
                
                <div className="physics-canvas" ref={sceneRef} style={{ backgroundImage: `url(${grassImg.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  {loading && <p style={{ textAlign: 'center', marginTop: '50px', color: '#fff', textShadow: '1px 1px 2px #000' }}>Memuat data...</p>}
                  {!loading && products.length === 0 && (
                    <p style={{ textAlign: 'center', marginTop: '50px', color: '#fff', textShadow: '1px 1px 2px #000' }}>Belum ada tabungan. Silakan tanam!</p>
                  )}
                  {products.map((p) => (
                    <div key={p.id} id={`money-${p.id}`} className="money">💰</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="table-container">
              <h2>Buku Besar Tabungan</h2>
              <table>
                <thead>
                  <tr><th>Tanggal</th><th>Keterangan</th><th>Nominal</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" className="empty-table">Memuat data...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan="4" className="empty-table">Belum ada data tabungan.</td></tr>
                  ) : (
                    products.map((p) => {
                      const displayDate = p.tanggal && p.tanggal !== '0000-00-00' 
                        ? new Date(p.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) 
                        : '-';
                      const displayNominal = p.nominal && !isNaN(p.nominal) 
                        ? Number(p.nominal).toLocaleString('id-ID') 
                        : '0';

                      return (
                        <tr key={p.id}>
                          <td>{displayDate}</td>
                          <td style={{ color: '#666' }}>{p.desc || '-'}</td>
                          <td style={{ color: 'var(--gold-hover)', fontWeight: 600 }}>Rp {displayNominal}</td>
                          <td>
                            <div className="table-actions">
                              <button className="btn-table-edit" onClick={() => triggerEdit(p)}>Edit</button>
                              <button className="btn-table-danger" onClick={() => handleDelete(p.id)}>Hapus</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* --- TAMPILAN STATISTIK --- */}
        {activeTab === 'statistik' && (
          <div className="card" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '2px solid var(--gold-primary)', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Grafik Tabungan</h3>
              
              {/* Filter Tombol Waktu - Hanya 3 Pilihan */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['1w', '1m', '1y'].map((range) => {
                  const labels = { '1w': '1 Minggu', '1m': '1 Bulan', '1y': '1 Tahun' };
                  return (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        border: '1px solid var(--border-dark)',
                        backgroundColor: timeRange === range ? 'var(--gold-primary)' : '#fff',
                        color: timeRange === range ? '#fff' : 'var(--text-main)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {labels[range]}
                    </button>
                  )
                })}
              </div>
            </div>

            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Belum ada data. Silakan tanam uang pertamamu di Dashboard!
              </div>
            ) : (
              <div style={{ position: 'relative', height: '400px', width: '100%' }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            )}
            
            <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
              {/* *Grafik dimulai dari hari pertama kamu menabung. Pilih rentang waktu di atas untuk melihat detail. */}
            </p>
          </div>
        )}

        {/* MODAL */}
        {activeTab === 'dashboard' && selectedProduct && (
          <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Detail Tabungan</h2>
                <button className="close-btn" onClick={() => setSelectedProduct(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="money-icon-large">💰</div>
                <h3>Rp {Number(selectedProduct.nominal || 0).toLocaleString('id-ID')}</h3>
                <p className="modal-desc">{selectedProduct.desc || 'Tidak ada catatan.'}</p>
                <p className="modal-price">
                  {selectedProduct.tanggal && selectedProduct.tanggal !== '0000-00-00'
                    ? new Date(selectedProduct.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    : '-'}
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn-edit" onClick={() => triggerEdit(selectedProduct)}>Edit Data</button>
                <button className="btn-danger" onClick={() => handleDelete(selectedProduct.id)}>Hapus Data</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}