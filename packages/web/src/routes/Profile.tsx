import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { Avatar } from "../components/ui/Avatar.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";

export const Profile = () => {
  const { profile, loading, logOut } = useAuth();

  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Profile</h1>

      <Card className="flex items-center gap-4">
        <Avatar
          src={profile.photoUrl}
          name={profile.displayName}
          className="h-14 w-14 text-lg"
        />
        <div>
          <p className="font-medium">{profile.displayName}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </Card>

      <Button variant="outline" onClick={() => void logOut()} className="w-full">
        Sign out
      </Button>
    </div>
  );
};
