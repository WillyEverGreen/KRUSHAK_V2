import {
  MdEco,
  MdHomeFilled,
  MdPerson,
  MdSearch,
  MdShowChart,
} from "react-icons/md";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

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

  return (
    <div className="mobile-frame">
      <div className="mobile-content">
        <Outlet />
      </div>
      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`bottom-nav-item ${active ? "active" : ""}`}
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
