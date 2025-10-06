import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import AuthProvider from "./Provider/AuthProvider";
import HeatMap from "./pages/HeatMap";
import Profile from "./pages/Profile";
import AQHistory from "./pages/AQHistory";
import PrivateRoute from "./Provider/PrivateRoute";
import HomeContent from "./components/HomeContent";
import NewLocationPage from "./app/locations/new/page";
import ManageLocationsPage from "./app/locations/manage/page";

const routes = (
  <Routes>
    <Route path="/" element={<Home />}>
      <Route index element={<HomeContent />} />
      <Route path="/locations/new" element={<NewLocationPage />} />
      <Route path="/locations/manage" element={<ManageLocationsPage />} />
      <Route path="heatmap" element={<HeatMap />} />
      <Route
        path="profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
    </Route>

    <Route path="/signin" element={<SignIn></SignIn>} />
    <Route path="/login" element={<SignIn></SignIn>} />
    <Route path="/signup" element={<SignUp></SignUp>} />
    <Route path="*" element={<h1>Not found</h1>} />
  </Routes>
);
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>{routes}</BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
