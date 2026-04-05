import React, { useState } from "react";
import {
  FileText,
  Fingerprint,
  Car,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Upload,
  Image as ImageIcon,
  Loader2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import ThemeToggle from "../components/ui/ThemeToggle";
import { createDriverProfile, getMyDriverProfile, updateDriverProfile } from "../services/driverProfileService";
import { compressImage } from "../utils/imageCompressor";

const VEHICLE_TYPES = [
  "MOTO",
  "EVMOTO",
  "AUTO",
  "EVAUTO",
  "GO",
  "EVGO",
  "PRIME",
  "XL"
];
const VEHICLE_MODELS = {
  MOTO: [
    "Honda Activa 6G", "TVS Jupiter 125", "Hero Splendor Plus", "Bajaj Pulsar 125",
    "Honda Shine 100", "TVS Raider 125", "Hero HF Deluxe", "Suzuki Access 125",
    "Yamaha FZ-S V3", "Bajaj CT 110X"
  ],
  EVMOTO: [
    "Ola Electric S1 Air", "Ather 450X", "TVS iQube S", "Bajaj Chetak Electric",
    "Hero Vida V1 Pro", "Ola Electric S1 Pro", "Ampere Nexus", "Greaves Ampere Magnus",
    "Pure EV ETrance Neo", "Okinawa Praise Pro"
  ],
  AUTO: [
    "Bajaj RE Compact 4S", "Piaggio Ape City Plus", "TVS King Duramax", "Mahindra Alfa Plus",
    "Atul Gem Paxx", "Bajaj RE 4S", "Piaggio Ape Xtra", "Mahindra Treo Yaari",
    "TVS King Deluxe", "Atul Smart"
  ],
  EVAUTO: [
    "Mahindra Treo", "Piaggio Ape E-City", "Euler HiLoad EV", "Bajaj RE EV",
    "Kinetic Safar Star", "OSM Rage Plus", "YC Electric Auto", "Saarthi EV Auto",
    "ETrio Touro Max", "Gayam Motor EV"
  ],
  GO: [
    "Maruti Suzuki Swift", "Maruti WagonR", "Tata Tiago", "Hyundai Grand i10 Nios",
    "Renault Kwid", "Maruti Celerio", "Tata Punch", "Hyundai i20", "Honda Brio",
    "Maruti Alto K10"
  ],
  EVGO: [
    "Tata Tiago EV", "MG Comet EV", "Citroen e-C3", "Tata Punch EV", "Maruti eVX",
    "Hyundai Casper EV", "BYD Seagull", "Renault Kwid EV", "PMV EaS-E", "Strom R3"
  ],
  PRIME: [
    "Honda City", "Hyundai Verna", "Maruti Suzuki Ciaz", "Skoda Slavia",
    "Volkswagen Virtus", "Toyota Yaris", "Hyundai Aura", "Tata Tigor",
    "Honda Amaze", "Maruti Dzire"
  ],
  XL: [
    "Toyota Innova Crysta", "Mahindra XUV700", "Hyundai Creta", "Kia Seltos",
    "Tata Safari", "MG Hector Plus", "Mahindra Scorpio N", "Toyota Fortuner",
    "Kia Carens", "Maruti Ertiga"
  ]
};

const DriverProfileFormPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    bio: "",
    licenseNumber: "",
    licenseExpiry: "",
    licenseImage: "",
    aadharNumber: "",
    aadharImage: "",
    vehicleType: "",
    vehicleName: "",
    vehicleNumber: "",
    vehicleImage: "",
    rcbookimage: "",
    insuranceExpiry: "",
    insuranceimage: "",
  });
  const [uploading, setUploading] = useState({
    license: false,
    aadhar: false,
    vehicle: false,
    rcbook: false,
    insurance: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Redirect if not driver, or fetch existing profile if driver
  React.useEffect(() => {
    if (user && user.role !== "driver") {
      navigate("/home");
      return;
    }

    const fetchExistingProfile = async () => {
      try {
        const res = await getMyDriverProfile();
        if (res.data.success && res.data.data) {
          const profile = res.data.data;

          // If profile is already approved, just go to dashboard
          if (profile.isApproved) {
            navigate("/driver/dashboard");
            return;
          }

          setIsUpdating(true);
          
          setFormData((prev) => ({
            ...prev,
            bio: profile.bio || "",
            licenseNumber: profile.license?.number || "",
            licenseExpiry: profile.license?.expiry ? profile.license.expiry.split('T')[0] : "",
            licenseImage: profile.license?.image || "",
            aadharNumber: profile.aadhar?.number || "",
            aadharImage: profile.aadhar?.image || "",
            vehicleType: profile.vehicle?.type || "",
            vehicleName: profile.vehicle?.name || "",
            vehicleNumber: profile.vehicle?.number || "",
            vehicleImage: profile.vehicle?.vehicleImage || "",
            rcbookimage: profile.vehicle?.rcBookImage || "",
            insuranceExpiry: profile.vehicle?.insuranceExpiry ? profile.vehicle.insuranceExpiry.split('T')[0] : "",
            insuranceimage: profile.vehicle?.insuranceImage || "",
          }));
        }
      } catch (err) {
        console.error("Error fetching driver profile:", err);
      }
    };

    fetchExistingProfile();
  }, [user, navigate]);

  const handleVehicleTypeChange = (e) => {
    setFormData({
      ...formData,
      vehicleType: e.target.value,
      vehicleName: "", // Reset model when type changes
    });
    if (errors.vehicleType) {
      setErrors({ ...errors, vehicleType: "", vehicleName: "" });
    }
  };

  const handleInputChange = (e, field) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleFileUpload = async (e, field, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Basic file validation
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPEG, JPG, and PNG images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError("File size should be less than 5MB.");
      return;
    }

    setUploading((prev) => ({ ...prev, [type]: true }));
    setError("");

    try {
      // 🧊 COMPRESS: Reduce image to ~1200px wide, 70% quality (JPEG)
      // This turns a 5-10MB mobile photo into a <500KB optimized file
      const compressedFile = await compressImage(file, { maxWidth: 1200, quality: 0.7 });
      
      const uploadData = new FormData();
      uploadData.append("image", compressedFile);

      // Import api from services/api
      const { default: api } = await import("../services/api");
      const response = await api.post("/upload", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setFormData((prev) => ({ ...prev, [field]: response.data.data.url }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    } catch (err) {
      setError("Failed to upload image. Please try again.");
      console.error("Upload error:", err);
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleImageRemove = (field) => {
    setFormData({ ...formData, [field]: "" });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.vehicleType) newErrors.vehicleType = "Vehicle type is required";
    if (!formData.vehicleName) newErrors.vehicleName = "Vehicle model is required";
    if (!formData.vehicleNumber) newErrors.vehicleNumber = "Vehicle number is required";
    if (!formData.licenseNumber) newErrors.licenseNumber = "License number is required";
    if (!formData.licenseExpiry) newErrors.licenseExpiry = "License expiry date is required";
    if (!formData.licenseImage) newErrors.licenseImage = "Driving license is mandatory";
    if (!formData.aadharNumber) newErrors.aadharNumber = "Aadhar number is required";
    if (!formData.aadharImage) newErrors.aadharImage = "Aadhar card is mandatory";
    if (!formData.vehicleImage) newErrors.vehicleImage = "Vehicle photo is mandatory";
    if (!formData.rcbookimage) newErrors.rcbookimage = "RC Book is mandatory";
    if (!formData.insuranceExpiry) newErrors.insuranceExpiry = "Insurance expiry is required";
    if (!formData.insuranceimage) newErrors.insuranceimage = "Insurance policy is mandatory";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      setError("Please upload all mandatory documents and fill all fields.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        bio: formData.bio.trim(),
        licenseNumber: formData.licenseNumber.trim(),
        licenseExpiry: formData.licenseExpiry,
        licenseImage: formData.licenseImage,
        aadharNumber: formData.aadharNumber.trim(),
        aadharImage: formData.aadharImage,
        vehicleType: formData.vehicleType.trim(),
        vehicleName: formData.vehicleName.trim(),
        vehicleNumber: formData.vehicleNumber.trim(),
        vehicleImage: formData.vehicleImage,
        rcBookImage: formData.rcbookimage,
        insuranceExpiry: formData.insuranceExpiry,
        insuranceImage: formData.insuranceimage,
      };

      let response;
      if (isUpdating) {
        response = await updateDriverProfile(payload);
      } else {
        response = await createDriverProfile(payload);
      }

      if (response.data.success) {
        setSuccess("Driver profile submitted for approval!");
        setTimeout(() => {
          navigate("/driver/dashboard");
        }, 1500);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit driver profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4 transition-colors duration-500">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="glass-card relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border-(--card-border) shadow-2xl">
        {/* Header */}
        <div className="from-primary/10 border-b border-(--card-border) bg-linear-to-br to-transparent p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Car className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tighter text-(--text-main)">
                Driver Profile
              </h1>
              <p className="text-sm text-(--text-dim) mt-1">
                Complete your professional driving credentials
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
              <CheckCircle className="text-green-500 shrink-0" size={20} />
              <p className="text-sm text-green-500">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Information */}
              <div className="pt-2 border-t border-(--card-border)/50">
                <Input
                  label="Short Bio"
                  placeholder="E.g., Reliable driver with 5 years of experience"
                  value={formData.bio}
                  onChange={(e) => handleInputChange(e, 'bio')}
                  error={errors.bio}
                  disabled={loading}
                />
              </div>

              {/* Vehicle Information */}
              <div className="pt-4 border-t border-(--card-border)/50">
                {/* Vehicle Type Dropdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="font-display ml-1 text-xs font-bold tracking-widest text-(--text-dim) uppercase transition-colors duration-500 mb-2 block">
                      Vehicle Type
                    </label>
                    <select
                      className={`w-full rounded-xl border border-(--card-border) bg-(--card-bg) p-3 font-sans text-sm text-(--text-main) transition-all duration-500 focus:ring-primary/20 focus:border-primary/50 focus:ring-2 focus:outline-none ${errors.vehicleType ? "border-red-500/50 ring-red-500/10" : ""}`}
                      value={formData.vehicleType || ""}
                      onChange={handleVehicleTypeChange}
                      disabled={loading}
                    >
                      <option value="">Select vehicle type</option>
                      {VEHICLE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.vehicleType && (
                      <div className="flex items-center gap-1.5 ml-1 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle size={12} className="text-red-500" />
                        <span className="text-[10px] font-bold text-red-500">{errors.vehicleType}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="font-display ml-1 text-xs font-bold tracking-widest text-(--text-dim) uppercase transition-colors duration-500 mb-2 block">
                      Vehicle Model
                    </label>
                    <select
                      className={`w-full rounded-xl border border-(--card-border) bg-(--card-bg) p-3 font-sans text-sm text-(--text-main) transition-all duration-500 focus:ring-primary/20 focus:border-primary/50 focus:ring-2 focus:outline-none ${errors.vehicleName ? "border-red-500/50 ring-red-500/10" : ""}`}
                      value={formData.vehicleName || ""}
                      onChange={(e) => handleInputChange(e, 'vehicleName')}
                      disabled={loading || !formData.vehicleType}
                    >
                      <option value="">{formData.vehicleType ? `Select ${formData.vehicleType} model` : 'Select type first'}</option>
                      {formData.vehicleType && VEHICLE_MODELS[formData.vehicleType]?.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                    {errors.vehicleName && (
                      <div className="flex items-center gap-1.5 ml-1 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle size={12} className="text-red-500" />
                        <span className="text-[10px] font-bold text-red-500">{errors.vehicleName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Vehicle Registration Number"
                    placeholder="e.g. GJ 01 AB 1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => handleInputChange(e, 'vehicleNumber')}
                    error={errors.vehicleNumber}
                    disabled={loading}
                  />

                </div>
              </div>


              {/* Document Uploads */}
              <div className="pt-6 border-t border-(--card-border)/50 space-y-6">
                <div>
                  <h3 className="font-display text-sm font-bold text-(--text-main) px-1">
                    Required Documents
                  </h3>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider ml-1 mt-1 animate-pulse">
                    ⚠️ Note: Upload a single image containing both front and back sides
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* License Upload & Info */}
                  <div className="space-y-4">
                    <Input
                      label="License Number"
                      placeholder="e.g. MH14 20110012345"
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange(e, 'licenseNumber')}
                      error={errors.licenseNumber}
                      disabled={loading}
                    />
                    <Input
                      label="License Expiry Date"
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => handleInputChange(e, 'licenseExpiry')}
                      error={errors.licenseExpiry}
                      disabled={loading}
                    />
                    <label className="text-[10px] font-bold text-(--text-dim) uppercase tracking-widest block ml-1 text-left">
                      Driving License Copy
                    </label>
                    <div className={`relative group aspect-video rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-4 overflow-hidden ${
                      formData.licenseImage ? 'border-primary/50 bg-primary/5' : errors.licenseImage ? 'border-red-500/50 bg-red-500/5' : 'border-(--card-border) hover:border-primary/30 bg-(--card-bg)'
                    }`}>
                      {formData.licenseImage ? (
                        <>
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              type="button"
                              onClick={() => handleImageRemove('licenseImage')}
                              className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-md transition-colors"
                              title="Remove Image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <img src={formData.licenseImage} alt="License" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="flex flex-col items-center gap-1">
                              <Upload size={20} className="text-white" />
                              <span className="text-[8px] font-bold text-white uppercase tracking-wider">Change Photo</span>
                            </div>
                          </div>
                          <label className="absolute inset-0 cursor-pointer">
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'licenseImage', 'license')} disabled={uploading.license} />
                          </label>
                        </>
                      ) : (
                        <div className="text-center">
                          {uploading.license ? (
                            <Loader2 size={24} className="text-primary animate-spin mx-auto mb-2" />
                          ) : (
                            <ImageIcon size={24} className={`${errors.licenseImage ? 'text-red-500' : 'text-(--text-dim)'} mx-auto mb-2 opacity-50`} />
                          )}
                          <p className={`text-[10px] font-bold ${errors.licenseImage ? 'text-red-500' : 'text-(--text-dim)'} mb-2`}>
                            {errors.licenseImage ? errors.licenseImage : 'Upload DL Photo'}
                          </p>
                          <label className={`cursor-pointer ${errors.licenseImage ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'} px-3 py-1.5 rounded-lg text-[10px] font-black hover:opacity-80 transition-colors inline-block`}>
                            Select File
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'licenseImage', 'license')} disabled={uploading.license} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Aadhar Upload & Info */}
                  <div className="space-y-4">
                    <Input
                      label="Aadhar Number"
                      placeholder="e.g. 1234 5678 9012"
                      value={formData.aadharNumber}
                      onChange={(e) => handleInputChange(e, 'aadharNumber')}
                      error={errors.aadharNumber}
                      disabled={loading}
                    />
                    <label className="text-[10px] font-bold text-(--text-dim) uppercase tracking-widest block ml-1 text-left">
                      Aadhar Card Copy
                    </label>
                    <div className={`relative group aspect-video rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-4 overflow-hidden ${
                      formData.aadharImage ? 'border-primary/50 bg-primary/5' : errors.aadharImage ? 'border-red-500/50 bg-red-500/5' : 'border-(--card-border) hover:border-primary/30 bg-(--card-bg)'
                    }`}>
                      {formData.aadharImage ? (
                        <>
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              type="button"
                              onClick={() => handleImageRemove('aadharImage')}
                              className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-md transition-colors"
                              title="Remove Image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <img src={formData.aadharImage} alt="Aadhar" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="flex flex-col items-center gap-1">
                              <Upload size={20} className="text-white" />
                              <span className="text-[8px] font-bold text-white uppercase tracking-wider">Change Photo</span>
                            </div>
                          </div>
                          <label className="absolute inset-0 cursor-pointer">
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'aadharImage', 'aadhar')} disabled={uploading.aadhar} />
                          </label>
                        </>
                      ) : (
                        <div className="text-center">
                          {uploading.aadhar ? (
                            <Loader2 size={24} className="text-primary animate-spin mx-auto mb-2" />
                          ) : (
                            <ImageIcon size={24} className={`${errors.aadharImage ? 'text-red-500' : 'text-(--text-dim)'} mx-auto mb-2 opacity-50`} />
                          )}
                          <p className={`text-[10px] font-bold ${errors.aadharImage ? 'text-red-500' : 'text-(--text-dim)'} mb-2`}>
                            {errors.aadharImage ? errors.aadharImage : 'Upload Aadhar Photo'}
                          </p>
                          <label className={`cursor-pointer ${errors.aadharImage ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'} px-3 py-1.5 rounded-lg text-[10px] font-black hover:opacity-80 transition-colors inline-block`}>
                            Select File
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'aadharImage', 'aadhar')} disabled={uploading.aadhar} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Image Upload */}
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-bold text-(--text-dim) uppercase tracking-widest block ml-1">
                      Vehicle Photo (Front View)
                    </label>
                    <div className={`relative group aspect-video md:aspect-[21/9] rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-4 overflow-hidden ${
                      formData.vehicleImage ? 'border-primary/50 bg-primary/5' : errors.vehicleImage ? 'border-red-500/50 bg-red-500/5' : 'border-(--card-border) hover:border-primary/30 bg-(--card-bg)'
                    }`}>
                      {formData.vehicleImage ? (
                        <>
                          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              type="button"
                              onClick={() => handleImageRemove('vehicleImage')}
                              className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-xl backdrop-blur-md transition-colors"
                              title="Remove Image"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <img src={formData.vehicleImage} alt="Vehicle" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="flex flex-col items-center gap-1">
                              <Upload size={24} className="text-white" />
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change Vehicle Photo</span>
                            </div>
                          </div>
                          <label className="absolute inset-0 cursor-pointer">
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'vehicleImage', 'vehicle')} disabled={uploading.vehicle} />
                          </label>
                        </>
                      ) : (
                        <div className="text-center">
                          {uploading.vehicle ? (
                            <Loader2 size={24} className="text-primary animate-spin mx-auto mb-2" />
                          ) : (
                            <ImageIcon size={24} className={`${errors.vehicleImage ? 'text-red-500' : 'text-(--text-dim)'} mx-auto mb-2 opacity-50`} />
                          )}
                          <p className={`text-[10px] font-bold ${errors.vehicleImage ? 'text-red-500' : 'text-(--text-dim)'} mb-2`}>
                            {errors.vehicleImage ? errors.vehicleImage : 'Upload Vehicle Photo'}
                          </p>
                          <label className={`cursor-pointer ${errors.vehicleImage ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'} px-3 py-1.5 rounded-lg text-[10px] font-black hover:opacity-80 transition-colors inline-block`}>
                            Select File
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'vehicleImage', 'vehicle')} disabled={uploading.vehicle} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RC Book Upload */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-(--text-dim) uppercase tracking-widest block ml-1">
                      RC Book Image (Registration Certificate)
                    </label>
                    <div className={`relative group aspect-video rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-4 overflow-hidden ${
                      formData.rcbookimage ? 'border-primary/50 bg-primary/5' : errors.rcbookimage ? 'border-red-500/50 bg-red-500/5' : 'border-(--card-border) hover:border-primary/30 bg-(--card-bg)'
                    }`}>
                      {formData.rcbookimage ? (
                        <>
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              type="button"
                              onClick={() => handleImageRemove('rcbookimage')}
                              className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-md transition-colors"
                              title="Remove Image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <img src={formData.rcbookimage} alt="RC Book" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="flex flex-col items-center gap-1">
                              <Upload size={20} className="text-white" />
                              <span className="text-[8px] font-bold text-white uppercase tracking-wider">Change Photo</span>
                            </div>
                          </div>
                          <label className="absolute inset-0 cursor-pointer">
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'rcbookimage', 'rcbook')} disabled={uploading.rcbook} />
                          </label>
                        </>
                      ) : (
                        <div className="text-center">
                          {uploading.rcbook ? (
                            <Loader2 size={24} className="text-primary animate-spin mx-auto mb-2" />
                          ) : (
                            <ImageIcon size={24} className={`${errors.rcbookimage ? 'text-red-500' : 'text-(--text-dim)'} mx-auto mb-2 opacity-50`} />
                          )}
                          <p className={`text-[10px] font-bold ${errors.rcbookimage ? 'text-red-500' : 'text-(--text-dim)'} mb-2`}>
                            {errors.rcbookimage ? errors.rcbookimage : 'Upload RC Book'}
                          </p>
                          <label className={`cursor-pointer ${errors.rcbookimage ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'} px-3 py-1.5 rounded-lg text-[10px] font-black hover:opacity-80 transition-colors inline-block`}>
                            Select File
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'rcbookimage', 'rcbook')} disabled={uploading.rcbook} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Insurance Upload & Info */}
                  <div className="space-y-4">
                    <Input
                      label="Insurance Expiry Date"
                      type="date"
                      value={formData.insuranceExpiry}
                      onChange={(e) => handleInputChange(e, 'insuranceExpiry')}
                      error={errors.insuranceExpiry}
                      disabled={loading}
                    />
                    <label className="text-[10px] font-bold text-(--text-dim) uppercase tracking-widest block ml-1 text-left">
                      Insurance Policy Image
                    </label>
                    <div className={`relative group aspect-video rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-4 overflow-hidden ${
                      formData.insuranceimage ? 'border-primary/50 bg-primary/5' : errors.insuranceimage ? 'border-red-500/50 bg-red-500/5' : 'border-(--card-border) hover:border-primary/30 bg-(--card-bg)'
                    }`}>
                      {formData.insuranceimage ? (
                        <>
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              type="button"
                              onClick={() => handleImageRemove('insuranceimage')}
                              className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-md transition-colors"
                              title="Remove Image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <img src={formData.insuranceimage} alt="Insurance" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="flex flex-col items-center gap-1">
                              <Upload size={20} className="text-white" />
                              <span className="text-[8px] font-bold text-white uppercase tracking-wider">Change Photo</span>
                            </div>
                          </div>
                          <label className="absolute inset-0 cursor-pointer">
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'insuranceimage', 'insurance')} disabled={uploading.insurance} />
                          </label>
                        </>
                      ) : (
                        <div className="text-center">
                          {uploading.insurance ? (
                            <Loader2 size={24} className="text-primary animate-spin mx-auto mb-2" />
                          ) : (
                            <ImageIcon size={24} className={`${errors.insuranceimage ? 'text-red-500' : 'text-(--text-dim)'} mx-auto mb-2 opacity-50`} />
                          )}
                          <p className={`text-[10px] font-bold ${errors.insuranceimage ? 'text-red-500' : 'text-(--text-dim)'} mb-2`}>
                            {errors.insuranceimage ? errors.insuranceimage : 'Upload Insurance'}
                          </p>
                          <label className={`cursor-pointer ${errors.insuranceimage ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'} px-3 py-1.5 rounded-lg text-[10px] font-black hover:opacity-80 transition-colors inline-block`}>
                            Select File
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'insuranceimage', 'insurance')} disabled={uploading.insurance} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading}
                icon={loading ? null : ArrowRight}
              >
                {loading ? (isUpdating ? "Updating Profile..." : "Submitting Profile...") : (isUpdating ? "Update Driver Profile" : "Submit Driver Profile")}
              </Button>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 text-xs text-(--text-dim) space-y-1">
              <p className="font-semibold text-blue-500">📋 Note:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Your profile will be reviewed by our admin team</li>
                <li>Once approved, you can start accepting and riding</li>
                <li>All documents must be clearly visible in images</li>
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DriverProfileFormPage;