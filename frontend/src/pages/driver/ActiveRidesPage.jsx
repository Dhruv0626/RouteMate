import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Clock,
  Phone,
  Star,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Map,
  Zap,
  MessageCircle,
  Eye,
  MoreVertical,
  TrendingUp,
  DollarSign,
  Fuel,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const ActiveRidesPage = () => {
  const navigate = useNavigate();
  const [selectedRide, setSelectedRide] = useState(null);
  const [expandedRide, setExpandedRide] = useState(null);
  const [showNavigation, setShowNavigation] = useState(false);

  // Mock active rides data
  const activeRides = [
    {
      id: 1,
      status: "in-progress",
      passengerName: "Sarah M.",
      rating: 4.9,
      phone: "+1 234-567-8901",
      pickup: "Downtown Station, Main St",
      dropoff: "International Airport Terminal 2",
      distance: {
        total: 25,
        remaining: 8.5,
      },
      duration: {
        total: 35,
        elapsed: 18,
        remaining: 17,
      },
      fare: {
        baseFare: 25.0,
        distanceFare: 12.5,
        timeFare: 8.5,
        surge: 1.2,
        total: 57.6,
      },
      currentLocation: "Highway 101, Near Exit 5",
      passengerLocation: "In vehicle",
      rideType: "Premium",
      bookingTime: "18 mins ago",
      routeOptimized: true,
      notes: "Passenger requested scenic route",
      emergencyContact: "+1 234-567-8901",
    },
    {
      id: 2,
      status: "waiting",
      passengerName: "John D.",
      rating: 4.7,
      phone: "+1 234-567-8902",
      pickup: "City Hospital, 5th Ave",
      dropoff: "Westside Mall",
      distance: {
        total: 12,
        remaining: 12,
      },
      duration: {
        total: 20,
        elapsed: 0,
        remaining: 20,
      },
      fare: {
        baseFare: 15.0,
        distanceFare: 6.0,
        timeFare: 0,
        surge: 1.0,
        total: 21.0,
      },
      currentLocation: "Outside main entrance",
      passengerLocation: "Not yet in vehicle",
      rideType: "Standard",
      bookingTime: "2 mins ago",
      routeOptimized: false,
      notes: "Waiting for passenger",
      emergencyContact: "+1 234-567-8902",
      waitTime: 2,
    },
  ];

  const rideStats = {
    activeRides: activeRides.length,
    totalEarningsToday: 247.5,
    completedRides: 7,
    averageRating: 4.85,
    onlineHours: 6.5,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "in-progress":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300";
      case "waiting":
        return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300";
      case "completed":
        return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300";
      default:
        return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "in-progress":
        return <Activity className="w-4 h-4" />;
      case "waiting":
        return <AlertCircle className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "in-progress":
        return "In Progress";
      case "waiting":
        return "Waiting for Passenger";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  const calculateProgress = (elapsed, total) => {
    return (elapsed / total) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Active Rides
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real-time trip details & navigation
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {rideStats.activeRides}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Active Rides
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {rideStats.completedRides}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Completed Today
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-5 h-5 text-violet-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                ${rideStats.totalEarningsToday}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Today's Earnings
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {rideStats.averageRating}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Avg Rating
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {rideStats.onlineHours}h
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Online Hours
            </p>
          </div>
        </div>

        {/* Active Rides List */}
        {activeRides.length > 0 ? (
          <div className="space-y-6">
            {activeRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Ride Summary */}
                <div
                  onClick={() =>
                    setExpandedRide(expandedRide === ride.id ? null : ride.id)
                  }
                  className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(
                            ride.status
                          )}`}
                        >
                          {getStatusIcon(ride.status)}
                          {getStatusLabel(ride.status)}
                        </span>
                        <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-semibold">
                          {ride.rideType}
                        </span>
                      </div>

                      {/* Passenger Info */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-bold">
                          {ride.passengerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {ride.passengerName}
                          </p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {ride.rating}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Route Info */}
                      <div className="flex items-start gap-3 mb-4">
                        <MapPin className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {ride.pickup}
                          </p>
                          <div className="flex items-center gap-1 my-1">
                            <div className="h-4 border-l-2 border-dashed border-gray-300 dark:border-gray-600 ml-0.5"></div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {ride.dropoff}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            Trip Progress
                          </span>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {Math.round(
                              calculateProgress(
                                ride.duration.elapsed,
                                ride.duration.total
                              )
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary-dark transition-all"
                            style={{
                              width: `${calculateProgress(
                                ride.duration.elapsed,
                                ride.duration.total
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Distance & Time */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Distance
                          </p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {ride.distance.remaining} km
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ride.distance.total} km total
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Time Remaining
                          </p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {ride.duration.remaining} min
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ride.duration.elapsed} min elapsed
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Current Fare
                          </p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            ${(
                              ride.fare.baseFare +
                              (ride.duration.elapsed / ride.duration.total) *
                                ride.fare.distanceFare +
                              ride.duration.elapsed * 0.45
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-6 h-6 text-gray-400 transition-transform flex-shrink-0 ${
                        expandedRide === ride.id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRide === ride.id && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/30 space-y-6">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setShowNavigation(!showNavigation)}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition"
                      >
                        <Navigation className="w-5 h-5" />
                        Navigation
                      </button>
                      <button className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition">
                        <Phone className="w-5 h-5" />
                        Call
                      </button>
                      <button className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition">
                        <MessageCircle className="w-5 h-5" />
                        Message
                      </button>
                      <button className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition">
                        <Eye className="w-5 h-5" />
                        Details
                      </button>
                    </div>

                    {/* Navigation Preview */}
                    {showNavigation && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Map className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Map view would display here
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              Real-time navigation integrated with your GPS
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Location Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          Your Location
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {ride.currentLocation}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          Passenger Location
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {ride.passengerLocation}
                        </p>
                      </div>
                    </div>

                    {/* Fare Breakdown */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                        Estimated Fare Breakdown
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-700 dark:text-gray-300">
                          <span>Base Fare</span>
                          <span>${ride.fare.baseFare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-700 dark:text-gray-300">
                          <span>Distance ({ride.distance.total} km)</span>
                          <span>${ride.fare.distanceFare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-700 dark:text-gray-300">
                          <span>Time ({ride.duration.total} min)</span>
                          <span>${ride.fare.timeFare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                          <span>Surge Multiplier</span>
                          <span>{ride.fare.surge.toFixed(1)}x</span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-gray-900 dark:text-white font-bold">
                          <span>Total (Estimated)</span>
                          <span>${(ride.fare.total * ride.fare.surge).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Passenger Notes */}
                    {ride.notes && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                          Passenger Notes
                        </p>
                        <p className="text-sm text-yellow-900 dark:text-yellow-100">
                          {ride.notes}
                        </p>
                      </div>
                    )}

                    {/* Control Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      {ride.status === "waiting" && (
                        <>
                          <button className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition">
                            Start Ride
                          </button>
                          <button className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition">
                            Cancel Ride
                          </button>
                        </>
                      )}
                      {ride.status === "in-progress" && (
                        <>
                          <button className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition">
                            Complete Ride
                          </button>
                          <button className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition">
                            Emergency
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
            <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Active Rides
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
              You don't have any active rides at the moment. Go online to start
              accepting ride requests.
            </p>
            <button className="mt-6 px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition">
              Go Online
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveRidesPage;