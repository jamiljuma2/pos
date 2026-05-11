export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen px-6 py-10 lg:px-10">{children}</div>;
}
