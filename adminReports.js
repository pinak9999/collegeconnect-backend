// ==========================================================
// 📊 SQL Analytics Queries For Admin Dashboard (Pending Frontend Connection)
// ==========================================================
const mysql = require('mysql2'); // Note: Make sure to run 'npm install mysql2' if you ever run this

/**
 * @desc Get Most Active Seniors using Complex SQL JOINs
 * @returns {String} SQL Query String
 */
const getMostActiveSeniorsQuery = () => {
    return `
        SELECT 
            u.name AS Senior_Name,
            c.college_name AS College,
            COUNT(b.booking_id) AS Total_Mentorships,
            AVG(r.rating) AS Average_Rating
        FROM users u
        INNER JOIN mentorship_bookings b ON u.email = b.senior_email
        INNER JOIN colleges c ON b.college_id = c.college_id
        LEFT JOIN ratings r ON b.booking_id = r.booking_id
        WHERE u.role = 'Senior' AND b.status = 'Completed'
        GROUP BY u.email
        ORDER BY Total_Mentorships DESC, Average_Rating DESC
        LIMIT 10;
    `;
};

/**
 * @desc Generate Monthly Revenue/Payout Report
 */
const getMonthlyRevenueReport = (month, year) => {
    return `
        SELECT 
            MONTHNAME(payment_date) AS Month,
            SUM(amount) AS Total_Revenue,
            SUM(platform_fee) AS Platform_Profit
        FROM payments
        WHERE MONTH(payment_date) = ${month} AND YEAR(payment_date) = ${year}
        GROUP BY MONTH(payment_date);
    `;
};

module.exports = {
    getMostActiveSeniorsQuery,
    getMonthlyRevenueReport
};