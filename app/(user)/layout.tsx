export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-deep">
      {children}
    </div>
  );
}
