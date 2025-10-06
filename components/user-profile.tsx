"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface UserProfileProps {
  user: User;
}

export function UserProfile({ user }: UserProfileProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.image || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await response.json();
      setAvatarUrl(url);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;

    setRemoving(true);

    try {
      const response = await fetch("/api/upload/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove avatar");
      }

      setAvatarUrl(null);
    } catch (error) {
      console.error("Remove avatar error:", error);
      alert("Failed to remove avatar");
    } finally {
      setRemoving(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Avatar className="w-24 h-24 mx-auto mb-4">
          <AvatarImage src={avatarUrl || undefined} alt={user.name} />
          <AvatarFallback className="text-lg">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Button
              onClick={handleUploadClick}
              className="inline-flex items-center space-x-2"
              disabled={uploading || removing}
            >
              <Upload size={16} />
              <span>{uploading ? "Uploading..." : "Upload Avatar"}</span>
            </Button>
            {avatarUrl && (
              <Button
                onClick={handleRemoveAvatar}
                disabled={removing || uploading}
                variant="destructive"
                className="inline-flex items-center space-x-2"
              >
                <Trash2 size={16} />
                <span>{removing ? "Removing..." : "Remove"}</span>
              </Button>
            )}
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading || removing}
          />
          <p className="text-xs text-gray-500 text-center">
            PNG, JPG, GIF up to 5MB
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" type="text" value={user.name} disabled />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={user.email} disabled />
        </div>
      </div>
    </div>
  );
}
