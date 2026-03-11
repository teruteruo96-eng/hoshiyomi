export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--deep)' }}>
      {children}
    </div>
  );
}
