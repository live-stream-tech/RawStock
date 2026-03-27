import { Outlet, Link, useLocation } from "react-router";
import { Home, Compass, Radio, User } from "lucide-react";

export function Layout() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "ホーム", path: "/" },
    { icon: Compass, label: "コミュニティ", path: "/communities" },
    { icon: Radio, label: "配信", path: "/live-list" },
    { icon: User, label: "マイページ", path: "/mypage" },
  ];

  const isLandingPage = location.pathname === "/";

  return (
    <div className="flex flex-col min-h-screen bg-[#334155] font-sans text-white">
      <main className={`flex-1 ${!isLandingPage ? "pb-20" : ""} overflow-x-hidden`}>
        <div className={!isLandingPage ? "max-w-lg mx-auto" : ""}>
          <Outlet />
        </div>
      </main>

      {/* Footer Navigation - Hidden on Landing Page per spec */}
      {!isLandingPage && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#475569] border-t border-[#0891B2] z-50">
          <div className="max-w-lg mx-auto h-full flex items-center justify-around px-2 pb-safe">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center flex-1 transition-colors ${
                    isActive ? "text-[#0891B2]" : "text-white/60"
                  }`}
                >
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 3 : 2} 
                  />
                  <span className="text-[10px] mt-0.5 font-bold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
