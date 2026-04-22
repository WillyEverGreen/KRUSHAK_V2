import { Navigate, Route, Routes } from "react-router-dom";
import MobileShell from "../components/MobileShell";
import SubpageLayout from "../components/SubpageLayout";
import HomeScreen from "../screens/HomeScreen";
import DiagnoseScreen from "../screens/DiagnoseScreen";
import MyFarmScreen from "../screens/MyFarmScreen";
import MarketScreen from "../screens/MarketScreen";
import ProfileScreen from "../screens/ProfileScreen";
import NewsScreen from "../screens/NewsScreen";
import ChatScreen from "../screens/ChatScreen";
import CareGuidesScreen from "../screens/CareGuidesScreen";

export default function App() {
  return (
    <div className="app-root">
      <Routes>
        <Route element={<MobileShell />}>
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/diagnose" element={<DiagnoseScreen />} />
          <Route path="/farm" element={<MyFarmScreen />} />
          <Route path="/market" element={<MarketScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Route>

        <Route
          path="/news"
          element={(
            <SubpageLayout title="Agri News">
              <NewsScreen />
            </SubpageLayout>
          )}
        />

        <Route
          path="/chat"
          element={(
            <SubpageLayout title="Farm Assistant">
              <ChatScreen />
            </SubpageLayout>
          )}
        />

        <Route
          path="/care-guides"
          element={(
            <SubpageLayout title="Care Guides">
              <CareGuidesScreen />
            </SubpageLayout>
          )}
        />

        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}
