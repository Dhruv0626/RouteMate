import React, { useState } from "react";
import {
  FileText,
  Fingerprint,
  Car,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import ThemeToggle from "../components/ui/ThemeToggle";
import { createDriverProfile } from "../services/driverProfileService";

const VEHICLE_TYPES = ["2-Wheeler", "3-Wheeler", "4-Wheeler"];

const VEHICLE_MODELS = {
  "2-Wheeler": ["Bike", "Scooter", "Motorcycle"],
  "3-Wheeler": ["Auto Rickshaw", "Tuk-Tuk", "Bajaj"],
  "4-Wheeler": ["Sedan", "SUV", "Hatchback", "MUV"],
};

const DriverProfileFormPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    licenseNumber: "",
    aadharNumber: "",
    vehicleType: "",
    vehicleName: "",
    vehicleNumber: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [vehicleModels, setVehicleModels] = useState([]);
  const [showNewModel, setShowNewModel] = useState(false);
  const [newModelName, setNewModelName] = useState("");

  // Redirect if not a driver
  React.useEffect(() => {
    if (user && user.role !== "driver") {
      navigate("/home");
    }
  }, [user, navigate]);

  const handleVehicleTypeChange = (e) => {
    const selectedType = e.target.value;
    setFormData({
      ...formData,
      vehicleType: selectedType,
      vehicleName: "",
    });

    const models = VEHICLE_MODELS[selectedType] || [];
    setVehicleModels(models);
    setShowNewModel(false);
    setNewModelName("");
  };

  const handleVehicleModelChange = (e) => {
    const value = e.target.value;
    if (value === "add-new") {
      setShowNewModel(true);
    } else {
      setFormData({ ...formData, vehicleName: value });
      setShowNewModel(false);
      setNewModelName("");
    }
  };

  const addNewModel = () => {
    if (newModelName.trim()) {
      const updatedModels = [...vehicleModels, newModelName.trim()];
      setVehicleModels(updatedModels);
      setFormData({ ...formData, vehicleName: newModelName.trim() });
      setNewModelName("");
      setShowNewModel(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.licenseNumber.trim() && formData.licenseNumber.length < 10) {
      newErrors.licenseNumber =
        "License number should be at least 10 characters";
    }

    if (
      formData.aadharNumber.trim() &&
      !/^\d{12}$/.test(formData.aadharNumber.trim())
    ) {
      newErrors.aadharNumber = "Aadhar number must be 12 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e, field) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await createDriverProfile({
        licenseNumber: formData.licenseNumber.trim() || null,
        aadharNumber: formData.aadharNumber.trim() || null,
        vehicleType: formData.vehicleType.trim() || null,
        vehicleName: formData.vehicleName.trim() || null,
        vehicleNumber: formData.vehicleNumber.trim() || null,
      });

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
            {/* License Number */}
            <div>
              <Input
                label="Driving License Number"
                icon={FileText}
                type="text"
                placeholder="e.g., DL-2024-0001234"
                value={formData.licenseNumber}
                onChange={(e) => handleInputChange(e, "licenseNumber")}
                error={errors.licenseNumber}
                disabled={loading}
              />
              <p className="text-xs text-(--text-dim) mt-2 ml-1">
                Enter your valid driving license number (can update later)
              </p>
            </div>

            
                {/* Aadhar Card Number */}
                <div>
                  <Input
                    label="Aadhar Card Number"
                    icon={Fingerprint}
                    type="text"
                    placeholder="Enter 12-digit Aadhar card number"
                    value={formData.aadharNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, aadharNumber: value });
                      if (errors.aadharNumber) {
                        setErrors({ ...errors, aadharNumber: "" });
                      }
                    }}
                    maxLength="12"
                    error={errors.aadharNumber}
                    disabled={loading}
                  />
                  <p className="text-xs text-(--text-dim) mt-2 ml-1">
                    Enter your 12-digit Aadhar card number for identity
                    verification (can update later)
                  </p>
                </div>

              {/* Vehicle Information */}
              <div className="pt-2 border-t border-(--card-border)/50">
                {/* Vehicle Type Dropdown */}
                <div className="mb-4">
                  <label className="font-display ml-1 text-xs font-bold tracking-widest text-(--text-dim) uppercase transition-colors duration-500 mb-2 block">
                    Vehicle Type
                  </label>
                  <select
                    className={`w-full rounded-xl border border-(--card-border) bg-(--card-bg) p-3 font-sans text-sm text-(--text-main) transition-all duration-500 focus:ring-primary/20 focus:border-primary/50 focus:ring-2 focus:outline-none ${errors.vehicleType ? "border-red-500/50 ring-red-500/10" : ""}`}
                    value={formData.vehicleType}
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
                  <p className="text-[10px] text-(--text-dim) mt-2 ml-1 opacity-70">
                    Choose your vehicle type (2, 3, 4 wheeler)
                  </p>
                </div>

                {/* Vehicle Model Dropdown */}
                {formData.vehicleType && (
                  <div className="mb-4">
                    <label className="font-display ml-1 text-xs font-bold tracking-widest text-(--text-dim) uppercase transition-colors duration-500 mb-2 block">
                      Vehicle Model/Name
                    </label>
                    <select
                      className={`w-full rounded-xl border border-(--card-border) bg-(--card-bg) p-3 font-sans text-sm text-(--text-main) transition-all duration-500 focus:ring-primary/20 focus:border-primary/50 focus:ring-2 focus:outline-none ${errors.vehicleName ? "border-red-500/50 ring-red-500/10" : ""}`}
                      value={formData.vehicleName}
                      onChange={handleVehicleModelChange}
                      disabled={loading}
                    >
                      <option value="">Select vehicle model</option>
                      {vehicleModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                      <option value="add-new">Add new model...</option>
                    </select>
                    {errors.vehicleName && (
                      <div className="flex items-center gap-1.5 ml-1 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle size={12} className="text-red-500" />
                        <span className="text-[10px] font-bold text-red-500">{errors.vehicleName}</span>
                      </div>
                    )}
                    <p className="text-[10px] text-(--text-dim) mt-2 ml-1 opacity-70">
                      Choose or add your vehicle model
                    </p>
                    {showNewModel && (
                      <div className="flex gap-2 mt-2">
                        <input
                          className="w-full rounded-xl border border-(--card-border) bg-(--card-bg) p-3 font-sans text-sm text-(--text-main) transition-all duration-500 focus:ring-primary/20 focus:border-primary/50 focus:ring-2 focus:outline-none"
                          type="text"
                          placeholder="Enter new model name"
                          value={newModelName}
                          onChange={(e) => setNewModelName(e.target.value)}
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="primary"
                          onClick={addNewModel}
                          disabled={loading || !newModelName.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                )}

              {/* Vehicle Number */}
              <br></br>
              <div>
                <Input
                  label="Vehicle Registration Number"
                  icon={FileText}
                  type="text"
                  placeholder="e.g., DL-01-AB-1234"
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange(e, "vehicleNumber")}
                  error={errors.vehicleNumber}
                  disabled={loading}
                />
                <p className="text-xs text-(--text-dim) mt-2 ml-1">
                  Your vehicle's unique registration number (can update later)
                </p>
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
                {loading ? "Submitting Profile..." : "Submit Driver Profile"}
              </Button>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 text-xs text-(--text-dim) space-y-1">
              <p className="font-semibold text-blue-500">📋 Note:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>All fields are optional - you can update them later</li>
                <li>Your profile will be reviewed by our admin team</li>
                <li>Once approved, you can start accepting and riding</li>
                <li>Keep your documents valid and up-to-date</li>
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DriverProfileFormPage;