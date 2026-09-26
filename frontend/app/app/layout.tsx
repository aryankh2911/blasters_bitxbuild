export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col" style={{ background: "#F0F0F0", color: "#121212" }}>
      {children}
    </div>
  );
}
