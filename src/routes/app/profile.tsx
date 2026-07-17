import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getDashboardData, updateProfilePicture } from "~/lib/user-actions";
import Avatar from "~/components/Avatar";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

const MAX_SIZE = 512;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      // Scale down to max 512x512 maintaining aspect ratio
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profilePic, setProfilePic] = useState<string>("");
  const [previewPic, setPreviewPic] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    try {
      const parsedUser = JSON.parse(stored);
      setUser(parsedUser);
      getDashboardData().then((d) => {
        setData(d);
        // Check if user has a profile picture in the returned data
        const pic = d?.user?.profile_picture || "";
        setProfilePic(pic);
      }).catch(console.error).finally(() => setLoading(false));
    } catch {
      navigate({ to: "/login" });
    }
  }, []);

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadMsg("Please select a JPG, PNG, or WebP image.");
      return;
    }
    try {
      const resized = await resizeImage(file);
      setPreviewPic(resized);
      setUploadMsg("");
    } catch {
      setUploadMsg("Failed to process image.");
    }
  }

  async function handleSave() {
    if (!previewPic) return;
    setUploading(true);
    setUploadMsg("");
    try {
      await updateProfilePicture({ imageDataUrl: previewPic });
      setProfilePic(previewPic);
      setPreviewPic("");
      // Update localStorage as well
      const stored = localStorage.getItem("flexora_user");
      if (stored) {
        const u = JSON.parse(stored);
        u.profile_picture = previewPic;
        localStorage.setItem("flexora_user", JSON.stringify(u));
      }
      setUploadMsg("Profile picture updated!");
    } catch (e: any) {
      setUploadMsg(e.message || "Failed to upload.");
    }
    setUploading(false);
  }

  function handleCancel() {
    setPreviewPic("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const isPt = user?.role === "pt";
  const profile = data?.profile;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            {isPt && (
              <a href="/app/pt/verify" className="text-sm text-gray-600 hover:text-[#1A56DB]">Verification</a>
            )}
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">My Profile</h1>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Profile Picture</h2>
            <div className="flex items-center gap-6">
              <div
                className="relative cursor-pointer group"
                onClick={handleAvatarClick}
                title="Click to change profile picture"
              >
                <Avatar
                  src={previewPic || profilePic}
                  name={user?.name || ""}
                  size={96}
                />
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium transition-opacity">
                    Change
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Click the avatar to upload a new picture. JPG, PNG, or WebP. Max 512×512.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {previewPic && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={uploading}
                      className="rounded-lg bg-[#1A56DB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50 transition-colors"
                    >
                      {uploading ? "Saving..." : "Save Picture"}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {uploadMsg && (
                  <p className={`mt-2 text-xs ${uploadMsg.includes("updated") ? "text-green-600" : "text-red-500"}`}>
                    {uploadMsg}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase text-gray-400">Name</label>
                <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-gray-400">Email</label>
                <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-gray-400">Role</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{user?.role}</p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-gray-400">Member Since</label>
                <p className="mt-1 text-sm text-gray-900">
                  {data?.user?.id ? "Active" : "New member"}
                </p>
              </div>
            </div>
          </div>

          {/* PT Profile (if PT) */}
          {isPt && profile && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Professional Profile</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase text-gray-400">Certification</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.certification_info || "Not provided"}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase text-gray-400">Experience</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.years_of_experience} years</p>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase text-gray-400">Education</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.education_location || "Not provided"}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase text-gray-400">Verification</label>
                  <p className="mt-1">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      profile.verification_status === "approved"
                        ? "bg-green-100 text-green-700"
                        : profile.verification_status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {profile.verification_status}
                    </span>
                  </p>
                </div>
              </div>
              {profile.bio && (
                <div className="mt-4">
                  <label className="block text-xs font-medium uppercase text-gray-400">Bio</label>
                  <p className="mt-1 text-sm text-gray-700">{profile.bio}</p>
                </div>
              )}
            </div>
          )}

          {/* Subscription info (if client) */}
          {!isPt && data?.subscription && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Subscription</h2>
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 uppercase">
                    {data.subscription.plan}
                  </span>
                  <p className="mt-1 text-sm text-gray-500">
                    Active since {new Date(data.subscription.started_at).toLocaleDateString()}
                  </p>
                </div>
                <a href="/#pricing" className="text-sm font-medium text-[#1A56DB] hover:underline">
                  Change Plan
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
