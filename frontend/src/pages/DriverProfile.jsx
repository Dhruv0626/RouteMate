import React, { useState, useEffect } from "react";
import {
  FileText,
  Fingerprint,
  Car,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Edit2,
  Save,
  X,
  Clock,
  User as UserIcon,
  Phone,
  Camera,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import ThemeToggle from "../components/ui/ThemeToggle";
import { getMyDriverProfile, updateDriverProfile } from "../services/driverProfileService";
import api from "../services/api";

const DriverProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    licenseNumber: "",
    aadharNumber: "",
    vehicleType: "",
    vehicleNumber: "",
    profileImage: "",
  });
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [errors, setErrors] = useState({});

  // Redirect if not a driver
  useEffect(() => {
    if (user && user.role !== "driver") {
      navigate(`/${user.role}/dashboard`);
    }
  }, [user, navigate]);

  // Fetch driver profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getMyDriverProfile();
        if (response.data.success && response.data.data) {
          const profileData = response.data.data;
          setProfile(profileData);
          setFormData({
            name: user?.name || "",
            phone: user?.Mobile_no || "",
            licenseNumber: profileData.license?.number || "",
            aadharNumber: profileData.aadhar?.number || "",
            vehicleType: profileData.vehicle?.type || "",
            vehicleNumber: profileData.vehicle?.number || "",
            profileImage: user?.profileImage || "",
          });
          if (user?.profileImage) {
            setProfileImagePreview(user.profileImage);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "driver") {
      fetchProfile();
    }
  }, [user]);

  const validateForm = () => {
    const newErrors = {};

    if (formData.licenseNumber.trim() && formData.licenseNumber.length < 10) {
      newErrors.licenseNumber = "License number should be at least 10 characters";
    }

    if (formData.aadharNumber.trim() && !/^\d{12}$/.test(formData.aadharNumber.trim())) {
      newErrors.aadharNumber = "Aadhar number must be 12 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e, field) => {
    setFormData({ ...formData, [field]: e.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
        setFormData({ ...formData, profileImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name) => {
    if (!name) return "D";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Update User profile using the new feature-based REST endpoint
      const phoneResponse = await api.post("/users/update-mobile", { mobileNumber: formData.phone });
      
      const response = await updateDriverProfile({
        licenseNumber: formData.licenseNumber.trim() || null,
        aadharNumber: formData.aadharNumber.trim() || null,
        vehicleType: formData.vehicleType.trim() || null,
        vehicleNumber: formData.vehicleNumber.trim() || null,
      });

      if (response.data.success && phoneResponse.data.success) {
        setProfile(response.data.data.profile);
        setSuccess("Profile updated successfully!");
        setIsEditing(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
      setFormData({
        name: user?.name || "",
        phone: user?.Mobile_no || "",
        licenseNumber: profile?.license?.number || "",
        aadharNumber: profile?.aadhar?.number || "",
        vehicleType: profile?.vehicle?.type || "",
        vehicleNumber: profile?.vehicle?.number || "",
        profileImage: user?.profileImage || "",
      });
    setProfileImagePreview(user?.profileImage || "");
    setErrors({});
  };

  if (loading) {
    return (
      <div className="mesh-bg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <Clock className="text-primary animate-spin" size={32} />
          </div>
          <p className="text-sm text-(--text-dim)">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg flex min-h-screen items-start justify-center p-4 py-16 md:py-20 transition-colors duration-500 overflow-y-auto">
      <div className="absolute top-4 left-4 z-50">
        <Button 
          variant="secondary" 
          onClick={() => navigate("/driver/dashboard")}
          className="rounded-xl border border-(--card-border) bg-(--card-bg)/50 backdrop-blur-md px-3 py-2 text-xs md:text-sm font-semibold text-(--text-dim) hover:text-(--text-main)"
        >
          Back
        </Button>
      </div>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="glass-card relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border-(--card-border) shadow-2xl">
        {/* Header */}
        <div className="from-primary/10 border-b border-(--card-border) bg-linear-to-br to-transparent p-8">
          <div className="flex items-start justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-xl shrink-0">
                  <Car className="text-primary" size={24} />
                </div>
                <div>
                  <h1 className="font-display text-xl md:text-2xl font-black tracking-tighter text-(--text-main)">
                    My Driver Profile
                  </h1>
                  <p className="text-xs md:text-sm text-(--text-dim) mt-1">
                    Manage your driving credentials
                  </p>
                </div>
              </div>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="secondary"
                  icon={Edit2}
                  className="w-full sm:w-auto"
                >
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Approval Status */}
          {profile && (
            <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              {profile.isApproved ? (
                <>
                  <CheckCircle className="text-emerald-500" size={24} />
                  <div>
                    <p className="font-semibold text-emerald-500">Approved</p>
                    <p className="text-xs text-(--text-dim)">Your profile has been verified by our admin team</p>
                  </div>
                </>
              ) : (
                <>
                  <Clock className="text-amber-500" size={24} />
                  <div>
                    <p className="font-semibold text-amber-500">Pending Approval</p>
                    <p className="text-xs text-(--text-dim)">Your profile is under review by our admin team</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Basic User Info Header */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-8 p-4 md:p-6 rounded-3xl bg-black/5 dark:bg-white/5 border border-(--card-border)">
            <div className="relative h-20 w-20 shrink-0 group">
              <div className="h-full w-full rounded-2xl bg-primary flex items-center justify-center text-3xl font-black text-black shadow-lg overflow-hidden transition-transform group-hover:scale-105">
                {profileImagePreview ? (
                  <img src={profileImagePreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  getInitials(user?.name)
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 cursor-pointer bg-(--bg-main) border border-(--card-border) p-2 rounded-xl text-primary shadow-xl hover:scale-110 transition-all hover:bg-primary hover:text-black z-10">
                  <Camera size={14} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              )}
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-xl font-black text-(--text-main)">{user?.name}</h2>
              <p className="text-sm font-medium text-(--text-dim)">{user?.email}</p>
              <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Verified Driver</span>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <CheckCircle className="text-emerald-500 shrink-0" size={20} />
              <p className="text-sm text-emerald-500">{success}</p>
            </div>
          )}

          {isEditing ? (
            // Edit Mode
            <form className="space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Full Name"
                  icon={UserIcon}
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange(e, "name")}
                  disabled={saving}
                />
                <Input
                  label="Phone Number"
                  icon={Phone}
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange(e, "phone")}
                  disabled={saving}
                />
              </div>

              {/* License Number */}
              <div>
                <Input
                  label="Driving License Number (Optional)"
                  icon={FileText}
                  type="text"
                  placeholder="e.g., DL-2024-0001234"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange(e, "licenseNumber")}
                  error={errors.licenseNumber}
                  disabled={saving}
                />
                <p className="text-xs text-(--text-dim) mt-2 ml-1">
                  Your valid driving license number
                </p>
              </div>

              {/* Aadhar Number */}
              <div>
                <Input
                  label="Aadhar Number (Optional)"
                  icon={Fingerprint}
                  type="text"
                  placeholder="Enter 12-digit Aadhar number"
                  value={formData.aadharNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    handleInputChange({ target: { value } }, "aadharNumber");
                  }}
                  maxLength="12"
                  error={errors.aadharNumber}
                  disabled={saving}
                />
                <p className="text-xs text-(--text-dim) mt-2 ml-1">
                  Your Aadhar number for identity verification
                </p>
              </div>

              {/* Vehicle Type */}
              <div>
                <Input
                  label="Vehicle Type (Optional)"
                  icon={Car}
                  type="text"
                  placeholder="e.g., Sedan, SUV, Hatchback"
                  value={formData.vehicleType}
                  onChange={(e) => handleInputChange(e, "vehicleType")}
                  error={errors.vehicleType}
                  disabled={saving}
                />
                <p className="text-xs text-(--text-dim) mt-2 ml-1">
                  Type of vehicle you will use for rides
                </p>
              </div>

              {/* Vehicle Number */}
              <div>
                <Input
                  label="Vehicle Registration Number (Optional)"
                  icon={FileText}
                  type="text"
                  placeholder="e.g., DL-01-AB-1234"
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange(e, "vehicleNumber")}
                  error={errors.vehicleNumber}
                  disabled={saving}
                />
                <p className="text-xs text-(--text-dim) mt-2 ml-1">
                  Your vehicle's registration number
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  variant="primary"
                  fullWidth
                  disabled={saving}
                  icon={saving ? null : Save}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="secondary"
                  fullWidth
                  disabled={saving}
                  icon={X}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            // View Mode
            <div className="space-y-5">
              {/* License Number */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 shrink-0">
                    <FileText className="text-primary" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-(--text-dim) uppercase tracking-wider">
                      Driving License Number
                    </p>
                    <p className="text-sm text-(--text-main) font-semibold mt-1 wrap-break-word">
                      {profile?.license?.number || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Aadhar Number */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 shrink-0">
                    <Fingerprint className="text-primary" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-(--text-dim) uppercase tracking-wider">
                      Aadhar Number
                    </p>
                    <p className="text-sm text-(--text-main) font-semibold mt-1 wrap-break-word">
                      {profile?.aadhar?.number ? `****-****-${profile.aadhar.number.slice(-4)}` : "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle Type */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 shrink-0">
                    <Car className="text-primary" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-(--text-dim) uppercase tracking-wider">
                      Vehicle Type
                    </p>
                    <p className="text-sm text-(--text-main) font-semibold mt-1">
                      {profile?.vehicle?.type || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle Number */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 shrink-0">
                    <FileText className="text-primary" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-(--text-dim) uppercase tracking-wider">
                      Vehicle Registration Number
                    </p>
                    <p className="text-sm text-(--text-main) font-semibold mt-1">
                      {profile?.vehicle?.number || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {profile && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-(--card-border)/50">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs font-semibold text-emerald-500 uppercase">
                      Total Rides
                    </p>
                    <p className="text-2xl font-black text-(--text-main) mt-2">
                      {profile.stats?.totalRides || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs font-semibold text-amber-500 uppercase">
                      Rating
                    </p>
                    <p className="text-2xl font-black text-(--text-main) mt-2">
                      {profile.averageRating?.toFixed(1) || "0.0"} ⭐
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverProfile;
