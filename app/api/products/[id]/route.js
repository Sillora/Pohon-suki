import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET /api/products/:id -> get one product
export async function GET(request, { params }) {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [
      params.id,
    ]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/products/:id -> update a product
export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const { name, description, price } = body;

    if (!name || price === undefined || price === '') {
      return NextResponse.json(
        { error: 'Field "name" dan "price" wajib diisi' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const [result] = await pool.query(
      'UPDATE products SET name = ?, description = ?, price = ? WHERE id = ?',
      [name, description || null, price, params.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ id: Number(params.id), name, description, price });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/products/:id -> delete a product
export async function DELETE(request, { params }) {
  try {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [
      params.id,
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
