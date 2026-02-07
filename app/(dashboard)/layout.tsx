export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar - will be implemented later */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-white">Token-Burn</h1>
          <p className="text-sm text-gray-400 mt-1">Chatbot Testing Platform</p>
        </div>
        <nav className="mt-6">
          <a
            href="/"
            className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Dashboard
          </a>
          <a
            href="/targets"
            className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Targets
          </a>
          <a
            href="/scenarios"
            className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Scenarios
          </a>
          <a
            href="/sessions"
            className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Sessions
          </a>
          <a
            href="/batches"
            className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Batches
          </a>
          <a
            href="/compare"
            className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Compare
          </a>
          <a
            href="/metrics"
            className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Metrics
          </a>
          <div className="mt-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Settings
          </div>
          <a
            href="/settings/webhooks"
            className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Webhooks
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header - will be implemented later */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Welcome</h2>
            <div className="text-sm text-gray-400">Next.js 16.1.4 + TypeScript + Tailwind</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
