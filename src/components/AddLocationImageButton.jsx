"use client";
import { useNavigate } from "react-router-dom";

export default function AddLocationImageButton({
  src = "/ui/add_location_btn.svg",
  alt = "add location",
  className = "h-9 w-auto cursor-pointer",
  to = "/locations/new",
}) {
  const navigate = useNavigate();
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={() => navigate(to)}
    />
  );
}
