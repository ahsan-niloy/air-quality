import { Outlet, useNavigate } from "react-router-dom";
import BottomNavbar from "../components/bottomNavbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useContext } from "react";
import { AuthContext } from "../Provider/AuthProvider";
import HomeContent from "../components/HomeContent";
import { Button } from "@/components/ui/button";

function Home() {
  const { user, loading, signOutUser } = useContext(AuthContext);
  var str = user?.displayName || "User";
  var matches = str.match(/\b(\w)/g);
  var acronym = matches.join("");
  const navigate = useNavigate();
  const signOutUserHandler = () => {
    signOutUser()
      .then(() => {
        navigate("/signin");
      })
      .catch((error) => {
        // An error happened.
      });
  }

  return (
    <div>
      <div className="flex justify-between items-center p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Foressers</h1>
        </div>
        <div className="flex items-center">
          <Button onClick={signOutUserHandler} className="ml-4">Sign Out</Button>
          <Avatar>
            <AvatarImage src="/avatar.png" alt="User Avatar" />
            {/* You can add a fallback if the image fails to load */}
            {/* <AvatarFallback>U</AvatarFallback> */}
            
          </Avatar>
          <Avatar className="ml-4">
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
