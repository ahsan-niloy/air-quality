import { useState } from "react";

import {
  Home,
  HomeSolid,
  Earth,
  EarthSolid,
  User,
  UserSolid,
} from "@mynaui/icons-react";
import { NavLink } from "react-router-dom";

const TABS = [
  { key: "home", label: "Home", Outline: Home, Solid: HomeSolid },
  { key: "heatmap", label: "Heat Map", Outline: Earth, Solid: EarthSolid },

  { key: "profile", label: "Profile", Outline: User, Solid: UserSolid },
];

export default function BottomNavbar() {
  const [active, setActive] = useState("home");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/90 backdrop-blur
                 dark:bg-neutral-900/80 dark:border-neutral-800"
      aria-label="Bottom Navigation"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map(({ key, label, Outline, Solid }) => {
          const isActive = key === active;
          const Icon = isActive ? Solid : Outline;

          return (
            <li key={key}>
              <NavLink
                to={key === "home" ? "/" : `/${key}`}
                type="button"
                onClick={() => setActive(key)}
                className={[
                  "group flex h-14 w-full flex-col items-center justify-center gap-1",
                  "text-neutral-600 hover:text-neutral-900",
                  "dark:text-neutral-400 dark:hover:text-white",
                  isActive ? "text-neutral-900 dark:text-white" : "",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
              >
                <span
                  className="grid place-items-center rounded-xl p-2"
                  aria-hidden
                >
                  <Icon className="size-6" />
                </span>
                <span className="text-[11px] leading-none">{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
      {/* iOS safe-area */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
