// src/pages/Profile.jsx
import { useContext, useMemo, useState } from "react";
import { AuthContext } from "../Provider/AuthProvider";
import { Mail, User2, LogOut, Pencil } from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

function initialsFrom(name) {
  if (!name) return "U";
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => (p[0] || "").toUpperCase()).join("");
  return letters || "U";
}

export default function Profile() {
  const navigate = useNavigate();
  // Safe fallback if context not mounted yet
  const ctx = useContext(AuthContext) || { user: null, loading: true };
  const { user, loading, signOutUser } = ctx;

  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState(user?.displayName || "");
  const [draftPhoto, setDraftPhoto] = useState(user?.photoURL || "");

  const displayName = user?.displayName || user?.email || "Unnamed User";
  const initials = useMemo(
    () => initialsFrom(user?.displayName || user?.email),
    [user]
  );

  // Replace with your real auth actions:
  const handleSave = () => {
    // Example only — replace with your update profile call
    console.log("Save profile:", {
      displayName: draftName,
      photoURL: draftPhoto,
    });
    setOpen(false);
  };
  const handleSignOut = () => {
    signOutUser()
      .then(() => {
        console.log("Signed out");
        navigate("/");
      })
      .catch((error) => {});
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-52" />
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">Guest</CardTitle>
              <p className="text-sm text-muted-foreground">
                You’re not signed in.
              </p>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Sign in to view and manage your profile details.
            </p>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={() => console.log("TODO: sign in")}>
              Sign in
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Signed in
  return (
    <div className="flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.photoURL || ""} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="text-xl truncate flex items-center gap-2">
              <span className="truncate">{displayName}</span>
              <Badge
                variant="secondary"
                className="rounded-full px-2 py-0 text-[10px]"
              >
                <User2 className="mr-1 h-3 w-3" />
                Member
              </Badge>
            </CardTitle>
            <div className="mt-1 flex items-center text-sm text-muted-foreground truncate">
              <Mail className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">{user.email || "No email"}</span>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="py-4">
          <div className="grid gap-3">
            <Row label="Display name" value={user.displayName || "—"} />
            <Row label="Email" value={user.email || "—"} />
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="photo">Photo URL</Label>
                  <Input
                    id="photo"
                    placeholder="https://…"
                    value={draftPhoto}
                    onChange={(e) => setDraftPhoto(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
