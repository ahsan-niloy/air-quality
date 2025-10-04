import { useContext } from "react";
import { AuthContext } from "../Provider/AuthProvider";

function Profile() {
  const { user, loading } = useContext(AuthContext);

  console.log(user.displayName);
  return (
    <div>
      <h1>Profile Page</h1>
      <h2>{user.displayName}</h2>
      <h2>{user.email}</h2>
    </div>
  );
}

export default Profile;
