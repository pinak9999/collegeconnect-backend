// फ़ाइल का नाम: controllers/appointment.controller.js
const { Appointment } = require("../models/appointment.model.js");
const { User } = require("../models/User.js"); // (यह फ़ाइल आपके पास होनी चाहिए)
const mongoose = require("mongoose");

// 'export const' की जगह 'exports.functionName' का इस्तेमाल करें

// --- 1. स्टूडेंट: नई अपॉइंटमेंट रिक्वेस्ट ---
exports.createAppointment = async (req, res) => {
    try {
        const { seniorId, scheduledTime } = req.body;
        const studentId = req.user._id;

        if (!seniorId || !scheduledTime) {
            return res.status(400).json({ message: "सीनियर आईडी और समय ज़रूरी है" });
        }

        const senior = await User.findById(seniorId);
        if (!senior || senior.role !== 'senior') {
            return res.status(404).json({ message: "सीनियर नहीं मिला" });
        }

        const appointment = await Appointment.create({
            student: studentId,
            senior: seniorId,
            scheduledTime: new Date(scheduledTime),
            status: "pending",
        });

        return res.status(201).json({ message: "रिक्वेस्ट भेज दी गई है", appointment });

    } catch (error) {
        console.error("Error creating appointment:", error);
        return res.status(500).json({ message: "सर्वर एरर" });
    }
};

// --- 2. सीनियर: रिक्वेस्ट Accept करना ---
exports.acceptAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const seniorId = req.user._id;

        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ message: "अपॉइंटमेंट नहीं मिली" });
        }
        if (appointment.senior.toString() !== seniorId.toString()) {
            return res.status(403).json({ message: "आप अधिकृत नहीं हैं" });
        }
        if (appointment.status !== 'pending') {
            return res.status(400).json({ message: "इस रिक्वेस्ट पर एक्शन लिया जा चुका है" });
        }

        appointment.status = "confirmed";
        await appointment.save();

        return res.status(200).json({ message: "अपॉइंटमेंट कन्फर्म हुई", appointment });

    } catch (error) {
        console.error("Error accepting appointment:", error);
        return res.status(500).json({ message: "सर्वर एरर" });
    }
};

// --- 3. सीनियर: नया टाइम Propose करना ---
exports.proposeNewTime = async (req, res) => {
    try {
        const { id } = req.params;
        const seniorId = req.user._id;
        const { newTime, reason } = req.body;

        if (!newTime || !reason) {
            return res.status(400).json({ message: "नया समय और कारण ज़रूरी है" });
        }

        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ message: "अपॉइंटमेंट नहीं मिली" });
        }
        if (appointment.senior.toString() !== seniorId.toString()) {
            return res.status(403).json({ message: "आप अधिकृत नहीं हैं" });
        }
        if (appointment.status !== 'pending') {
            return res.status(400).json({ message: "इस रिक्वेस्ट पर एक्शन लिया जा चुका है" });
        }

        appointment.status = "senior_proposed";
        appointment.scheduledTime = new Date(newTime);
        appointment.rejectionReason = reason;
        await appointment.save();

        return res.status(200).json({ message: "नया समय भेजा गया", appointment });

    } catch (error) {
        console.error("Error proposing new time:", error);
        return res.status(500).json({ message: "सर्वर एरR" });
    }
};

// --- 4. स्टूडेंट: सीनियर का नया टाइम Confirm करना ---
exports.confirmNewTime = async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user._id;

        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ message: "अपॉइंटमेंट नहीं मिली" });
        }
        if (appointment.student.toString() !== studentId.toString()) {
            return res.status(403).json({ message: "आप अधिकृत नहीं हैं" });
        }
        if (appointment.status !== 'senior_proposed') {
            return res.status(400).json({ message: "यह अपॉइंटमेंट 'proposed' स्टेट में नहीं है" });
        }

        appointment.status = "confirmed";
        await appointment.save();

        return res.status(200).json({ message: "अपॉइंटमेंट कन्फर्म हुई", appointment });

    } catch (error) {
        console.error("Error confirming new time:", error);
        return res.status(500).json({ message: "सर्वर एरर" });
    }
};

// --- 5. दोनों: अपनी सारी Appointments देखना ---
exports.getMyAppointments = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let query = {};
        if (userRole === 'student') {
            query = { student: userId };
        } else if (userRole === 'senior') {
            query = { senior: userId };
        }

        const appointments = await Appointment.find(query)
            .populate("student", "name email profilePhoto")
            .populate("senior", "name email profilePhoto")
            .sort({ scheduledTime: -1 });

        return res.status(200).json(appointments);

    } catch (error) {
        console.error("Error fetching appointments:", error);
        return res.status(500).json({ message: "सर्वर एरर" });
    }
};

// --- 6. दोनों: Cancel करना ---
exports.cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ message: "अपॉइंटमेंट नहीं मिली" });
        }
        if (appointment.student.toString() !== userId.toString() && appointment.senior.toString() !== userId.toString()) {
            return res.status(403).json({ message: "आप इस अपॉइंटमेंट को कैंसिल नहीं कर सकते" });
        }
        if (appointment.status === 'completed') {
             return res.status(400).json({ message: "पूरी हो चुकी अपॉइंटमेंट कैंसिल नहीं हो सकती" });
        }

        appointment.status = "cancelled";
        await appointment.save();

        return res.status(200).json({ message: "अपॉइंटमेंट कैंसिल कर दी गई है", appointment });

    } catch (error) {
        console.error("Error cancelling appointment:", error);
        return res.status(500).json({ message: "सर्वर एरर" });
    }
};

// --- 7. दोनों: 'Completed' मार्क करना ---
exports.completeAppointment = async (req, res) => {
     try {
        const { id } = req.params;
        const userId = req.user._id;

        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ message: "अपॉइंटमेंट नहीं मिली" });
        }
        if (appointment.status !== 'confirmed') {
            return res.status(400).json({ message: "यह मीटिंग अभी कन्फर्म नहीं हुई है" });
        }
         if (appointment.student.toString() !== userId.toString() && appointment.senior.toString() !== userId.toString()) {
            return res.status(403).json({ message: "आप अधिकृत नहीं हैं" });
        }

        appointment.status = "completed";
        await appointment.save();

        return res.status(200).json({ message: "अपॉइंटमेंट पूरी हुई", appointment });

    } catch (error) {
        console.error("Error completing appointment:", error);
        return res.status(500).json({ message: "सर्वर एरर" });
    }
};