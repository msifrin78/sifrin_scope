
'use client';

import { useState } from 'react';
import { useData } from '../../../context/data-context';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { useToast } from '../../../hooks/use-toast';
import { User, Upload } from 'lucide-react';

export default function SettingsPage() {
  const { profilePicture, setProfilePicture } = useData();
  const [newImage, setNewImage] = useState<string | null>(profilePicture);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = () => {
    setProfilePicture(newImage);
    toast({
      title: 'Settings Saved',
      description: 'Your profile picture has been updated.',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your profile picture here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={newImage ?? undefined} alt="User avatar" />
              <AvatarFallback>
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="picture">Upload Picture</Label>
              <Input id="picture" type="file" accept="image/*" onChange={handleImageChange} />
               <p className="text-sm text-muted-foreground">
                Choose a new profile picture.
              </p>
            </div>
          </div>
           <Button onClick={handleSaveChanges} disabled={newImage === profilePicture}>
             <Upload className="mr-2 h-4 w-4"/>
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
