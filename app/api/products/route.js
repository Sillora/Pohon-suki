import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    const pool = getPool();
    // Mengambil data dari tabel tabungan
    const [rows] = await pool.query(
      'SELECT id, nominal, `desc`, tanggal FROM tabungan ORDER BY tanggal DESC, id DESC'
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
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
      'INSERT INTO tabungan (nominal, `desc`, tanggal) VALUES (?, ?, ?)',
      [nominal, desc || null, tanggal]
    );

    return NextResponse.json(
      { id: result.insertId, nominal, desc, tanggal },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}