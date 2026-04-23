-- ==========================================================
-- 🏢 REAP CampusConnect - Advanced SQL Analytics Schema
-- ==========================================================

-- 1. Create Colleges Table (Primary Data)
CREATE TABLE IF NOT EXISTS colleges (
    college_id INT AUTO_INCREMENT PRIMARY KEY,
    college_name VARCHAR(255) NOT NULL,
    location VARCHAR(100),
    established_year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Mentorship Bookings Table (Foreign Keys Added)
CREATE TABLE IF NOT EXISTS mentorship_bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    student_email VARCHAR(255) NOT NULL,
    senior_email VARCHAR(255) NOT NULL,
    college_id INT,
    booking_date DATE,
    status ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') DEFAULT 'Pending',
    FOREIGN KEY (college_id) REFERENCES colleges(college_id) ON DELETE CASCADE
);

-- 3. 🔥 COMPLEX JOIN QUERY: 

SELECT 
    c.college_name,
    COUNT(m.booking_id) AS total_bookings,
    SUM(CASE WHEN m.status = 'Completed' THEN 1 ELSE 0 END) AS successful_sessions
FROM 
    colleges c
LEFT JOIN 
    mentorship_bookings m ON c.college_id = m.college_id
GROUP BY 
    c.college_id
HAVING 
    total_bookings > 5
ORDER BY 
    total_bookings DESC;


DELIMITER //
CREATE TRIGGER After_Booking_Insert
AFTER INSERT ON mentorship_bookings
FOR EACH ROW
BEGIN
    INSERT INTO admin_logs (action_type, details, log_time)
    VALUES ('NEW_BOOKING', CONCAT('New session booked for ', NEW.student_email), NOW());
END; //
DELIMITER ;