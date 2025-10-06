import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useContext } from "react";
import { AuthContext } from "../Provider/AuthProvider";
import { NavLink, useNavigate } from "react-router-dom";
import BottomNavbar from "../components/BottomNavbar";

function SignUp() {
  const { user, signUpUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const signUp = (e) => {
    e.preventDefault();
    console.log("Sign Up");
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const displayName = form.displayName.value;
    console.log(email, password);
    signUpUser(email, password, displayName)
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
          Sign up page
        </h1>
        <form onSubmit={signUp} className="flex flex-col gap-4">
          <Input placeholder="Name" type="text" name="displayName" />
          <Input type="email" name="email" placeholder="Email" />
          <Input name="password" type="password" placeholder="Password" />
          <Button type="submit">Sign Up</Button>
        </form>
        <NavLink to="/signin">
          <h3>
            Alreade have account? <span className="text-blue-700">Sign In</span>
          </h3>
        </NavLink>
      </div>
      <BottomNavbar></BottomNavbar>
    </div>
  );
}

export default SignUp;
