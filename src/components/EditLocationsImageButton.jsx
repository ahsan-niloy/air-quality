"use client";
import { useNavigate } from "react-router-dom";

export default function EditLocationsImageButton({
  src = "/ui/edit_location_btn.svg",
  alt = "edit locations",
  className = "h-9 w-auto cursor-pointer",
  to = "/locations/manage",
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
