import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../Firebase/firebase.init";
import React, { useEffect } from "react";
import { createContext, useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db } from "../Firebase/firebase.init";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const signInUser = (email, password) => {
    setLoading(true);
    return signInWithEmailAndPassword(auth, email, password);
  };
  const signUpUser = async (email, password, displayName) => {
    setLoading(true);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return cred;
  };

  const signOutUser = () => {
    setLoading(true);
    return signOut(auth);
  };

  const authInfo = {
    user,
    loading,
    signInUser,
    signUpUser,
    signOutUser,
  };

  useEffect(() => {
    const unSubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unSubscribe();
    };
  }, []);
  return (
    <AuthContext.Provider value={authInfo}> {children}</AuthContext.Provider>
  );
}

export default AuthProvider;
