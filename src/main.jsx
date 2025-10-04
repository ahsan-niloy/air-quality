import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import AuthProvider from "./Provider/AuthProvider";

const routes = (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/signin" element={<SignIn></SignIn>} />
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
