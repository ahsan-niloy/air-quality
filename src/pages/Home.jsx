import { Outlet } from "react-router-dom";
import BottomNavbar from "../components/BottomNavbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useContext } from "react";
import { AuthContext } from "../Provider/AuthProvider";
import HomeContent from "../components/HomeContent";

function Home() {
  const { user, loading, signOutUser } = useContext(AuthContext);
  var str = user?.displayName || "User";
  var matches = str.match(/\b(\w)/g);
  var acronym = matches.join("");

  return (
    <div>
      <div className="flex justify-between items-center p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Foressers</h1>
        </div>
        <div>
          <Avatar>
            <AvatarImage src="/avatar.png" alt="User Avatar" />
            {/* You can add a fallback if the image fails to load */}
            {/* <AvatarFallback>U</AvatarFallback> */}
            <AvatarFallback>{acronym}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      <Outlet />
      <BottomNavbar />
    </div>
  );
}

export default Home;
