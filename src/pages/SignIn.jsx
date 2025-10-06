import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthContext } from "../Provider/AuthProvider";
import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import BottomNavbar from "../components/BottomNavbar";

function SignIn() {
  const { user, signInUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const signIn = (e) => {
    e.preventDefault();
    console.log("Sign In");
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    console.log(email, password);
    signInUser(email, password)
      .then((result) => {
        const loggedUser = result.user;
        navigate("/");
        form.reset();
      })
      .catch((error) => {
        console.log(error);
      });
  };
  return (
    <div>
      <div className="flex flex-col gap-4 w-1/2 mx-auto mt-20 justify-center my-auto m-4 p-4 border rounded h-1/2">
        <h1 className="flex justify-center text-xl font-bold mb-4">
          Login In page
        </h1>
        <form className="flex flex-col gap-4" onSubmit={signIn}>
          <Input name="email" id="email" type="email" placeholder="Email" />
          <Input
            name="password"
            id="password"
            type="password"
            placeholder="Password"
          />
          <Button type="submit">Log In</Button>
        </form>
        <NavLink to="/signup">
          <h3>
            Don't have Account? <span className="text-blue-700">Sign Up</span>
          </h3>
        </NavLink>
      </div>
      <BottomNavbar></BottomNavbar>
    </div>
  );
}

export default SignIn;
