import './globals.css';

export const metadata = {
  title: 'CRUD Produk - Next.js + MySQL',
  description: 'Contoh aplikasi CRUD dengan Next.js dan MySQL (Aiven)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
