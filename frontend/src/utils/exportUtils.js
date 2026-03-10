/**
 * Exports earnings data to a CSV file and triggers a download.
 * @param {Object} data - The earnings data to export.
 * @param {string} filename - The name of the file to save.
 */
export const exportEarningsToCSV = (data, filename) => {
    // Simple CSV generation logic
    const headers = ["Metric", "Value"];
    const rows = [
        ["Total Earnings", data.totalEarnings],
        ["Today's Earnings", data.todayEarnings],
        ["Week Earnings", data.weekEarnings],
        ["Monthly Earnings", data.thisMonthEarnings],
        ["Completed Rides", data.completedRides],
        ["Cancelled Rides", data.cancelledRides],
        ["Average Rating", data.averageRating],
    ];

    let csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
