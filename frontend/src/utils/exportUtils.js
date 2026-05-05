import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Formats a date value into a stable DD-MM-YYYY HH:MM string.
 * Avoids locale-dependent formatting that causes ### in Excel.
 */
const formatDate = (val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "N/A";
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
};

const formatDateOnly = (val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "N/A";
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dd = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd}-${mon}-${yyyy}`;
};

const formatTimeOnly = (val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "N/A";
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
};

/**
 * Helper to convert image to base64 for PDF
 */
const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute("crossOrigin", "anonymous");
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL("image/png");
            resolve(dataURL);
        };
        img.onerror = (error) => reject(error);
        img.src = url;
    });
};

/**
 * Adds the RouteMate header to a PDF document
 */
const addPDFHeader = async (doc, title) => {
    try {
        const logoData = await getBase64ImageFromURL("/images/logo/logo.png");
        if (logoData) {
            doc.addImage(logoData, "PNG", 15, 10, 15, 15); // Logo on left
        }
    } catch (e) {
        console.warn("Logo could not be loaded for PDF", e);
    }

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 204, 0); // RouteMate Yellow
    doc.text("RouteMate", 35, 20); // App Name next to logo

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(title, 35, 26);

    doc.setLineWidth(0.5);
    doc.setDrawColor(220);
    doc.line(15, 32, 195, 32); // Horizontal line
};

/**
 * Exports earnings data to a CSV file and triggers a download.
 */
export const exportEarningsToCSV = (data, filename) => {
    const rows = [
        ["APP NAME", "RouteMate"],
        ["Report Type", "Earnings Report"],
        ["Generated At", formatDate(new Date())],
        [],
        ["Metric", "Value"],
        ["Total Earnings", `₹${data.totalEarnings}`],
        ["Today's Earnings", `₹${data.todayEarnings}`],
        ["Week Earnings", `₹${data.weekEarnings}`],
        ["Monthly Earnings", `₹${data.thisMonthEarnings}`],
        ["Completed Rides", data.completedRides],
        ["Cancelled Rides", data.cancelledRides],
        ["Average Rating", data.averageRating],
    ];

    // Create CSV content with quotes to handle potential commas and BOM for Excel UTF-8 support
    const csvString = rows.map(row =>
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Exports earnings data to a PDF file.
 */
export const exportEarningsToPDF = async (data, filename) => {
    const doc = new jsPDF();
    await addPDFHeader(doc, "Earnings Summary Report");

    const rows = [
        ["Total Earnings", `Rs. ${data.totalEarnings}`],
        ["Today's Earnings", `Rs. ${data.todayEarnings}`],
        ["Week Earnings", `Rs. ${data.weekEarnings}`],
        ["Monthly Earnings", `Rs. ${data.thisMonthEarnings}`],
        ["Completed Rides", data.completedRides.toString()],
        ["Cancelled Rides", data.cancelledRides.toString()],
        ["Average Rating", data.averageRating.toString()],
    ];

    autoTable(doc, {
        startY: 40,
        head: [["Metric", "Details"]],
        body: rows,
        theme: 'striped',
        headStyles: { fillStyle: 'fill', fillColor: [255, 204, 0], textColor: [0, 0, 0] },
    });

    doc.save(filename);
};

/**
 * Exports ride history data to a CSV file and triggers a download.
 */
export const exportRideHistoryToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    const headers = [
        "ID", "Customer/Driver", "Pickup", "Dropoff", "Distance (km)",
        "Duration (min)", "Amount (₹)", "Status", "Date", "Ride Type", "Payment Method"
    ];

    const rows = data.map(ride => [
        ride.id,
        ride.name,
        ride.pickup,
        ride.dropoff,
        ride.distance,
        ride.duration,
        `₹${ride.amount}`,
        ride.status,
        formatDateOnly(ride.createdAt || ride.date),
        ride.rideType,
        ride.paymentMethod
    ]);

    const csvString = [headers, ...rows].map(row =>
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Exports ride history data to a PDF file.
 */
export const exportRideHistoryToPDF = async (data, filename) => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF('landscape');
    await addPDFHeader(doc, "Complete Ride History Report");

    const headers = [
        "ID", "User", "Pickup", "Dropoff", "Dist", "Dur", "Amt", "Status", "Date"
    ];

    const rows = data.map(ride => [
        ride.id.substring(ride.id.length - 6), // Short ID
        ride.name,
        ride.pickup.substring(0, 30) + (ride.pickup.length > 30 ? "..." : ""),
        ride.dropoff.substring(0, 30) + (ride.dropoff.length > 30 ? "..." : ""),
        ride.distance + "km",
        ride.duration + "m",
        "Rs. " + ride.amount,
        (ride.status || "UNKNOWN").toUpperCase(),
        ride.date
    ]);

    autoTable(doc, {
        startY: 40,
        head: [headers],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [255, 204, 0], textColor: [0, 0, 0], fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 30 },
            4: { cellWidth: 15 },
            5: { cellWidth: 15 },
            6: { cellWidth: 20 },
        },
        styles: { fontSize: 8 }
    });

    doc.save(filename);
};

/**
 * Exports revenue analytics data to a CSV file.
 */
export const exportRevenueToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    const headers = ["Date", "Time", "From", "To", "Passenger", "Driver", "Total Fare (₹)", "Platform Income (₹)"];
    const rows = data.map(trip => [
        formatDateOnly(trip.date),
        formatTimeOnly(trip.date),
        trip.source,
        trip.destination,
        trip.passenger,
        trip.driver,
        `₹${trip.totalFare}`,
        `₹${trip.platformIncome}`
    ]);

    const csvString = [headers, ...rows].map(row =>
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Exports revenue analytics data to a PDF file.
 */
export const exportRevenueToPDF = async (data, filename) => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF('landscape');
    await addPDFHeader(doc, "Platform Revenue Detailed Report");

    const headers = [
        "Date", "Passenger", "Driver", "From", "To", "Fare", "Platform"
    ];

    const rows = data.map(trip => [
        new Date(trip.date).toLocaleDateString("en-IN"),
        trip.passenger,
        trip.driver,
        trip.source?.substring(0, 20) + "...",
        trip.destination?.substring(0, 20) + "...",
        "Rs. " + trip.totalFare,
        "Rs. " + trip.platformIncome
    ]);

    autoTable(doc, {
        startY: 40,
        head: [headers],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [255, 204, 0], textColor: [0, 0, 0] },
    });

    doc.save(filename);
};

/**
 * Exports wallet transaction history to a CSV file.
 */
export const exportWalletToCSV = (transactions, filename) => {
    if (!transactions || transactions.length === 0) return;

    const headers = ["Date", "Type", "Method", "Status", "Amount (₹)"];
    const rows = transactions.map(tx => {
        // Derive Method
        let method = "N/A";
        const desc = (tx.description || "").toLowerCase();
        const ref = (tx.reference || "").toLowerCase();

        if (desc.includes("upi")) method = "UPI";
        else if (desc.includes("wallet")) method = "WALLET";
        else if (desc.includes("cash")) method = "CASH";
        else if (ref === "topup") method = "RAZORPAY";
        else if (ref === "withdrawal") method = "BANK";
        else if (ref === "referral") method = "BONUS";
        else if (tx.method) method = tx.method; // Fallback to raw field if exists

        // Derive Status
        const status = (tx.status || "SUCCESS").toUpperCase();

        return [
            formatDateOnly(tx.createdAt || tx.date),
            (tx.type || "UNKNOWN").toUpperCase(),
            method.toUpperCase(),
            status,
            `₹${tx.amount || 0}`
        ];
    });

    const csvString = [headers, ...rows].map(row =>
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Exports audit logs to a CSV file.
 */
export const exportAuditLogsToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    const headers = ["Date", "Actor", "Role", "Action", "Category", "Details", "IP"];
    const rows = data.map(log => [
        formatDateOnly(log.date),
        log.actor || "SYSTEM",
        (log.actorRole || "N/A").toUpperCase(),
        (log.action || "UNKNOWN").toUpperCase(),
        (log.category || "GENERAL").toUpperCase(),
        log.details || "No details provided",
        log.ip || "N/A"
    ]);

    const csvString = [headers, ...rows].map(row =>
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Exports wallet transaction history to a PDF statement.
 */
export const exportWalletStatementToPDF = async (data, walletStats, filename) => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF();
    await addPDFHeader(doc, "Account Statement & Transaction History");

    // Summary Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Wallet Summary", 15, 40);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Available Balance: Rs. ${walletStats.availableBalance}`, 15, 48);
    doc.text(`Total Withdrawn: Rs. ${walletStats.totalWithdrawn}`, 15, 54);
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 15, 60);

    const headers = ["Date", "Type", "Method", "Status", "Amount"];
    const rows = data.map(tx => {
        // Derive Method
        let method = "N/A";
        const desc = (tx.description || "").toLowerCase();
        const ref = (tx.reference || "").toLowerCase();

        if (desc.includes("upi")) method = "UPI";
        else if (desc.includes("wallet")) method = "WALLET";
        else if (desc.includes("cash")) method = "CASH";
        else if (ref === "topup") method = "RAZORPAY";
        else if (ref === "withdrawal") method = "BANK";
        else if (ref === "referral") method = "BONUS";
        else if (tx.method) method = tx.method;

        // Derive Status
        const status = (tx.status || "SUCCESS").toUpperCase();

        return [
            formatDate(tx.createdAt || tx.date),
            (tx.type || "UNKNOWN").toUpperCase(),
            method.toUpperCase(),
            status,
            "Rs. " + (tx.amount || 0)
        ];
    });

    autoTable(doc, {
        startY: 70,
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [255, 204, 0], textColor: [0, 0, 0] },
    });

    doc.save(filename);
};



