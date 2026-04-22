import {
  MdEco,
  MdHomeFilled,
  MdPerson,
  MdSearch,
  MdShowChart,
} from "react-icons/md";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSessionStore } from "../app/store";

const navItems = [
  { label: "Home", path: "/home", icon: MdHomeFilled },
  { label: "Diagnose", path: "/diagnose", icon: MdSearch },
  { label: "My Farm", path: "/farm", icon: MdEco },
  { label: "Market", path: "/market", icon: MdShowChart },
  { label: "Profile", path: "/profile", icon: MdPerson },
];

export default function MobileShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);

  return (
    <div className="mobile-frame">
      <div className="mobile-content">
        <Outlet />
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);
          /* Show a green dot on Profile when NOT logged in */
          const showDot = item.path === "/profile" && !user;

          return (
            <button
              key={item.path}
              className={`bottom-nav-item ${active ? "active" : ""}`}
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
              id={`nav-${item.label.toLowerCase().replace(/\s+/, "-")}`}
            >
              <span style={{ position: "relative", display: "inline-flex" }}>
                <Icon size={22} />
                {showDot && (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#f97316",
                      border: "1.5px solid #fff",
                    }}
                  />
                )}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
