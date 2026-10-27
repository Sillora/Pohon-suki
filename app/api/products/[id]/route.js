import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const { nominal, desc, tanggal } = body;

    if (!nominal || !tanggal) {
      return NextResponse.json(
        { error: 'Field "nominal" dan "tanggal" wajib diisi' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const [result] = await pool.query(
      'UPDATE tabungan SET nominal = ?, `desc` = ?, tanggal = ? WHERE id = ?',
      [nominal, desc || null, tanggal, params.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ id: Number(params.id), nominal, desc, tanggal });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM tabungan WHERE id = ?', [
      params.id,
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}