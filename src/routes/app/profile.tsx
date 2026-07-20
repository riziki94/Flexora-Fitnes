import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getDashboardData, updateProfilePicture, uploadPTCertificate, removePTCertificate } from "~/lib/user-actions";
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

  // Certificate state (PT only)
  const [certImage, setCertImage] = useState<string>("");
  const [certPreview, setCertPreview] = useState<string>("");
  const [certUploading, setCertUploading] = useState(false);
  const [certMsg, setCertMsg] = useState("");
  const certFileInputRef = useRef<HTMLInputElement>(null);
  const [certLightbox, setCertLightbox] = useState<string>("");

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
        // Load certificate image for PTs
        if (d?.profile?.certificate_image) {
          setCertImage(d.profile.certificate_image);
        }
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

  // Certificate handlers
  function handleCertUploadClick() {
    certFileInputRef.current?.click();
  }

  function handleCertFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setCertMsg("Please select a JPG, PNG, or WebP image.");
      return;
    }
    // Validate size (~2MB)
    if (file.size > 2_100_000) {
      setCertMsg("File too large. Max 2MB allowed.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCertPreview(result);
      setCertMsg("");
    };
    reader.onerror = () => setCertMsg("Failed to read file.");
    reader.readAsDataURL(file);
  }

  async function handleCertSave() {
    if (!certPreview) return;
    setCertUploading(true);
    setCertMsg("");
    try {
      await uploadPTCertificate({ imageDataUrl: certPreview });
      setCertImage(certPreview);
      setCertPreview("");
      setCertMsg("Certificate uploaded!");
    } catch (e: any) {
      setCertMsg(e.message || "Failed to upload.");
    }
    setCertUploading(false);
  }

  function handleCertCancel() {
    setCertPreview("");
    if (certFileInputRef.current) certFileInputRef.current.value = "";
  }

  async function handleCertRemove() {
    setCertUploading(true);
    setCertMsg("");
    try {
      await removePTCertificate();
      setCertImage("");
      setCertPreview("");
      setCertMsg("Certificate removed.");
    } catch (e: any) {
      setCertMsg(e.message || "Failed to remove.");
    }
    setCertUploading(false);
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

        {/* PT Profile Picture Reminder */}
        {isPt && (!profilePic || profilePic === "") && (
          <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-800">Profilbildet ditt er påkrevd for å bli synlig for kunder</h3>
                <p className="mt-1 text-sm text-red-700">
                  Uten profilbilde vil du ikke vises i søkeresultater, oppdagelsessiden eller forsiden. 
                  Last opp et profilbilde nedenfor for å bli synlig.
                </p>
              </div>
            </div>
          </div>
        )}

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

          {/* Certificate Upload (PT only) */}
          {isPt && profile && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Certificate / Diploma</h2>
              <div className="space-y-4">
                {certImage && (
                  <div className="relative inline-block">
                    <img
                      src={certImage}
                      alt="Certificate"
                      className="max-h-48 rounded-lg border border-gray-200 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setCertLightbox(certImage)}
                      title="Click to view full-size"
                    />
                    <button
                      onClick={handleCertRemove}
                      disabled={certUploading}
                      className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm"
                      title="Remove certificate"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                {!certImage && !certPreview && (
                  <div
                    onClick={handleCertUploadClick}
                    className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 hover:border-[#1A56DB] hover:bg-blue-50/30 transition-colors"
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      <p className="mt-2 text-sm font-medium text-gray-600">Click to upload certificate</p>
                      <p className="mt-1 text-xs text-gray-400">JPG, PNG, or WebP — max 2MB</p>
                    </div>
                  </div>
                )}
                {certPreview && (
                  <div className="space-y-3">
                    <img
                      src={certPreview}
                      alt="Certificate preview"
                      className="max-h-64 rounded-lg border border-gray-200 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setCertPreview(certPreview)}
                      title="Click to view full-size"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCertSave}
                        disabled={certUploading}
                        className="rounded-lg bg-[#1A56DB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50 transition-colors"
                      >
                        {certUploading ? "Saving..." : "Save Certificate"}
                      </button>
                      <button
                        onClick={handleCertCancel}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={certFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCertFileChange}
                />
                {certMsg && (
                  <p className={`text-xs ${certMsg.includes("uploaded") || certMsg.includes("removed") ? "text-green-600" : "text-red-500"}`}>
                    {certMsg}
                  </p>
                )}
              </div>
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

      {/* Certificate Lightbox Modal */}
      {certLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setCertLightbox("")}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setCertLightbox("")}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-gray-700 hover:bg-gray-200 shadow-lg transition-colors"
              title="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={certLightbox}
              alt="Certificate full-size"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
