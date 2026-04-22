import { MdArrowBack } from "react-icons/md";
import { useNavigate } from "react-router-dom";

export default function SubpageLayout({ title, children }) {
  const navigate = useNavigate();

  return (
    <div className="subpage">
      <div className="subpage-header">
        <button className="header-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <MdArrowBack size={24} />
        </button>
        <div style={{ fontWeight: 700 }}>{title}</div>
      </div>
      <div className="mobile-content">{children}</div>
    </div>
  );
}
