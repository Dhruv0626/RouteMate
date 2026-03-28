import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  User,
  Phone,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  ToggleRight,
  BarChart3,
  Settings,
  TrendingUp,
  Filter,
  Download,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const SchedulePage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("2025-03-07");
  const [timeFilter, setTimeFilter] = useState("all");
  const [expandedRide, setExpandedRide] = useState(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [availabilityToggle, setAvailabilityToggle] = useState(true);

  // Mock schedule data
  const scheduleStats = {
    upcomingRides: 5,
    todayScheduled: 3,
    weekScheduled: 18,
    monthScheduled: 65,
    hoursOnline: 32.5,
    cancellationRate: 2.1,
  };

  const upcomingRides = [
    {
      id: 1,
      time: "09:30 AM",
      pickup: "Downtown Station, Main St",
      dropoff: "Airport Terminal 2",
      passengerName: "Sarah M.",
      distance: "25 km",
      estimatedDuration: "35 mins",
      status: "confirmed",
      rating: 4.9,
      bookingTime: "2 hours ago",
      phone: "+1 234-567-8901",
      rideType: "Premium",
    },
    {
      id: 2,
      time: "11:15 AM",
      pickup: "City Hospital, 5th Ave",
      dropoff: "Westside Mall",
      passengerName: "John D.",
      distance: "12 km",
      estimatedDuration: "20 mins",
      status: "confirmed",
      rating: 4.7,
      bookingTime: "45 mins ago",
      phone: "+1 234-567-8902",
      rideType: "Standard",
    },
    {
      id: 3,
      time: "02:00 PM",
      pickup: "Business District Center",
      dropoff: "Grand Hotel",
      passengerName: "Emma L.",
      distance: "8 km",
      estimatedDuration: "15 mins",
      status: "pending",
      rating: 4.6,
      bookingTime: "30 mins ago",
      phone: "+1 234-567-8903",
      rideType: "Premium",
    },
    {
      id: 4,
      time: "04:45 PM",
      pickup: "Central Market",
      dropoff: "Residential Area - Oak Lane",
      passengerName: "Michael T.",
      distance: "18 km",
      estimatedDuration: "28 mins",
      status: "confirmed",
      rating: 4.8,
      bookingTime: "1 hour ago",
      phone: "+1 234-567-8904",
      rideType: "Standard",
    },
    {
      id: 5,
      time: "06:30 PM",
      pickup: "Shopping Plaza Entrance",
      dropoff: "Downtown Residential",
      passengerName: "Lisa P.",
      distance: "15 km",
      estimatedDuration: "25 mins",
      status: "confirmed",
      rating: 4.9,
      bookingTime: "20 mins ago",
      phone: "+1 234-567-8905",
      rideType: "Standard",
    },
  ];

  const availabilitySlots = [
    { id: 1, day: "Monday", start: "08:00 AM", end: "06:00 PM", active: true },
    { id: 2, day: "Tuesday", start: "08:00 AM", end: "06:00 PM", active: true },
    { id: 3, day: "Wednesday", start: "10:00 AM", end: "08:00 PM", active: true },
    { id: 4, day: "Thursday", start: "08:00 AM", end: "06:00 PM", active: true },
    { id: 5, day: "Friday", start: "08:00 AM", end: "10:00 PM", active: true },
    { id: 6, day: "Saturday", start: "09:00 AM", end: "09:00 PM", active: true },
    { id: 7, day: "Sunday", start: "Off Day", end: "", active: false },
  ];

  const scheduleTrend = [
    { week: "Week 1", rides: 12, hours: 28.5 },
    { week: "Week 2", rides: 15, hours: 32.0 },
    { week: "Week 3", rides: 18, hours: 35.5 },
    { week: "Week 4", rides: 20, hours: 38.3 },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300";
      case "pending":
        return "bg-amber-100/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300";
      case "completed":
        return "bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300";
      default:
        return "bg-black/5 dark:bg-white/5 border-(--card-border) text-(--text-dim)";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredRides = upcomingRides.filter((ride) => {
    if (timeFilter === "morning")
      return ride.time.includes("AM") && parseInt(ride.time) < 12;
    if (timeFilter === "afternoon")
      return ride.time.includes("PM") && parseInt(ride.time) < 6;
    if (timeFilter === "evening") return ride.time.includes("PM");
    return true;
  });

  return (
    <div className="min-h-screen bg-(--bg-main) pb-20 transition-colors duration-500">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-(--card-bg) border-b border-(--card-border) backdrop-blur-md transition-all duration-500">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-(--text-main)">
                My Schedule
              </h1>
              <p className="text-sm text-(--text-dim)">
                Manage your rides & availability
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-(--text-main)">
                {scheduleStats.upcomingRides}
              </span>
            </div>
            <p className="text-sm text-(--text-dim)">
              Upcoming Rides
            </p>
          </div>
          <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold text-(--text-main)">
                {scheduleStats.hoursOnline}h
              </span>
            </div>
            <p className="text-sm text-(--text-dim)">
              Hours This Week
            </p>
          </div>
          <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-5 h-5 text-violet-500" />
              <span className="text-2xl font-bold text-(--text-main)">
                {scheduleStats.weekScheduled}
              </span>
            </div>
            <p className="text-sm text-(--text-dim)">
              This Week
            </p>
          </div>
          <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold text-(--text-main)">
                {scheduleStats.cancellationRate}%
              </span>
            </div>
            <p className="text-sm text-(--text-dim)">
              Cancellation Rate
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-2 space-y-6">
            {/* Schedule Header */}
            <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-(--text-main)">
                  Today's Rides
                </h2>
                <div className="flex gap-2">
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Times</option>
                    <option value="morning">Morning (AM)</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening (PM)</option>
                  </select>
                </div>
              </div>

              {/* Rides List */}
              <div className="space-y-4">
                {filteredRides.length > 0 ? (
                  filteredRides.map((ride) => (
                    <div
                      key={ride.id}
                     className="border border-(--card-border) rounded-lg hover:shadow-md dark:hover:shadow-lg transition-all overflow-hidden"
                    >
                      <div
                        onClick={() =>
                          setExpandedRide(
                            expandedRide === ride.id ? null : ride.id
                          )
                        }
                        className="p-4 cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold text-sm whitespace-nowrap bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                <Clock className="w-4 h-4" />
                                {ride.time}
                              </span>
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(
                                  ride.status
                                )}`}
                              >
                                {getStatusIcon(ride.status)}
                                {ride.status.charAt(0).toUpperCase() +
                                  ride.status.slice(1)}
                              </span>
                              <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-semibold">
                                {ride.rideType}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                              <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-emerald-500" />
                              <div>
                                <p className="font-medium text-(--text-main)">
                                  {ride.pickup}
                                </p>
                                <p className="text-sm mt-1 flex items-center gap-2">
                                  <ChevronRight className="w-3 h-3" />
                                  {ride.dropoff}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-(--text-main)">
                              {ride.distance}
                            </p>
                            <p className="text-xs text-(--text-dim) opacity-80">
                              {ride.estimatedDuration}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedRide === ride.id && (
                        <div className="border-t border-(--card-border) p-4 bg-(--card-bg) space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-(--text-dim)">
                                  Passenger
                                </p>
                                <p className="font-semibold text-(--text-main)">
                                  {ride.passengerName}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-(--text-dim)">
                                  Phone
                                </p>
                                <p className="font-semibold text-(--text-main)">
                                  {ride.phone}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 flex items-center justify-center">
                                <span className="text-sm font-bold text-amber-500">
                                   ★
                                 </span>
                               </div>
                              <div>
                                <p className="text-xs text-(--text-dim)">
                                  Passenger Rating
                                </p>
                                <p className="font-semibold text-(--text-main)">
                                  {ride.rating}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Clock className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-(--text-dim)">
                                  Booked
                                </p>
                                <p className="font-semibold text-(--text-main)">
                                  {ride.bookingTime}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                            <button className="flex-1 py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition">
                              Accept Ride
                            </button>
                            <button className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition">
                              Decline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-(--text-dim) opacity-30 mx-auto mb-4" />
                    <p className="text-(--text-dim)">
                      No rides scheduled for this time
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Trend */}
            <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
              <h3 className="text-lg font-bold text-(--text-main) mb-4">
                 Monthly Trend
               </h3>
              <div className="space-y-3">
                {scheduleTrend.map((trend, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-16">
                      {trend.week}
                    </span>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-primary-dark h-full"
                          style={{
                            width: `${(trend.rides / 20) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-(--text-main)">
                         {trend.rides} rides
                       </p>
                      <p className="text-xs text-(--text-dim)">
                        {trend.hours}h
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Availability Sidebar */}
          <div className="space-y-6">
            {/* Availability Status */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl p-6 border border-primary/20 dark:border-primary/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-(--text-main)">
                  Availability
                </h3>
                <button
                  onClick={() => setAvailabilityToggle(!availabilityToggle)}
                  className={`p-2 rounded-lg transition ${
                    availabilityToggle
                      ? "bg-primary text-white"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  <ToggleRight className="w-5 h-5" />
                </button>
              </div>
              <p
                className={`text-sm font-semibold ${
                  availabilityToggle
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-orange-700 dark:text-orange-300"
                }`}
              >
                {availabilityToggle ? "🟢 You are online" : "🔴 You are offline"}
              </p>
              <p className="text-xs text-(--text-dim) mt-2">
                Toggle to go online/offline and accept rides
              </p>
            </div>

            {/* Weekly Availability */}
            <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-(--text-main)">
                  Weekly Schedule
                </h3>
                <button
                  onClick={() => setShowAddSlot(!showAddSlot)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  title="Add new schedule"
                >
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              </div>

              {showAddSlot && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <input
                    type="text"
                    placeholder="Day name..."
                    className="w-full mb-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2 mb-2">
                    <input
                      type="time"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="time"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button className="w-full py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition text-sm">
                    Add Slot
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {availabilitySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-lg border transition flex items-center justify-between ${
                      slot.active
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div>
                      <p
                        className={`font-semibold text-sm ${
                          slot.active
                            ? "text-(--text-main)"
                            : "text-(--text-dim)"
                        }`}
                      >
                        {slot.day}
                      </p>
                      <p
                        className={`text-xs ${
                          slot.active
                            ? "text-(--text-main) opacity-70"
                            : "text-(--text-dim)"
                        }`}
                      >
                        {slot.active
                          ? `${slot.start} - ${slot.end}`
                          : slot.start}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule Stats */}
            <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
              <h3 className="text-lg font-bold text-(--text-main) mb-4">
                This Month
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-(--text-dim)">
                    Total Rides
                  </span>
                  <span className="font-bold text-(--text-main)">
                    {scheduleStats.monthScheduled}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-(--text-dim)">
                    Avg. Rides/Day
                  </span>
                  <span className="font-bold text-(--text-main)">
                    2.2
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-(--text-dim)">
                    Cancellations
                  </span>
                  <span className="font-bold text-(--text-main)">
                    1
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Completion Rate
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    98.5%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;