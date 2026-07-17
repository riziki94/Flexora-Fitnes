import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { registerUser } from "~/lib/auth-actions";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"client" | "pt">("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [birthday, setBirthday] = useState("");

  // PT fields
  const [certificationInfo, setCertificationInfo] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  const [educationLocation, setEducationLocation] = useState("");
  const [bio, setBio] = useState("");
  const [diplomaFile, setDiplomaFile] = useState<File | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (role === "pt" && !certificationInfo && !diplomaFile) {
      setError("PTs must provide certification information or upload a diploma");
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser({
        data: {
          email,
          password,
          name,
          role,
          country: country || undefined,
          birthday: birthday || undefined,
          certificationInfo: role === "pt" ? certificationInfo : undefined,
          yearsOfExperience: role === "pt" ? yearsOfExperience : undefined,
          educationLocation: role === "pt" ? educationLocation : undefined,
          bio: role === "pt" ? bio : undefined,
        },
      });

      // Store token
      if (typeof window !== "undefined") {
        localStorage.setItem("flexora_token", result.token);
        localStorage.setItem("flexora_user", JSON.stringify(result.user));
        document.cookie = `flexora_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }

      navigate({ to: "/app/dashboard" });
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-2xl font-light text-gray-500">Fitnes</span>
          </a>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Create Account</h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Role selector */}
          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                role === "client"
                  ? "bg-[#1A56DB] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              I'm a Client
            </button>
            <button
              type="button"
              onClick={() => setRole("pt")}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                role === "pt"
                  ? "bg-[#1A56DB] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              I'm a PT
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                placeholder="Min. 6 characters"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                />
              </div>
              <div>
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1">
                  Birthday
                </label>
                <input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                />
              </div>
            </div>

            {/* PT-only fields */}
            {role === "pt" && (
              <div className="space-y-4 rounded-lg border border-[#3B82F6]/30 bg-blue-50/50 p-4">
                <p className="text-sm font-medium text-[#1A56DB]">Professional Information</p>

                <div>
                  <label htmlFor="certification" className="block text-sm font-medium text-gray-700 mb-1">
                    Certification Info
                  </label>
                  <textarea
                    id="certification"
                    value={certificationInfo}
                    onChange={(e) => setCertificationInfo(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                    placeholder="Describe your certifications (e.g., NASM-CPT, ISSA, etc.)"
                  />
                </div>

                <div>
                  <label htmlFor="diploma" className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Diploma/Certificate
                  </label>
                  <input
                    id="diploma"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setDiplomaFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-[#1A56DB] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#1E40AF]"
                  />
                  {diplomaFile && (
                    <p className="mt-1 text-xs text-green-600">Selected: {diplomaFile.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                      Years of Experience
                    </label>
                    <input
                      id="experience"
                      type="number"
                      min={0}
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                    />
                  </div>
                  <div>
                    <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
                      Education Location
                    </label>
                    <input
                      id="education"
                      type="text"
                      value={educationLocation}
                      onChange={(e) => setEducationLocation(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                    placeholder="Tell clients about your training philosophy..."
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#1A56DB] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-50"
            >
              {loading ? "Creating Account..." : `Sign Up as ${role === "pt" ? "PT" : "Client"}`}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-[#1A56DB] hover:text-[#1E40AF]">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
