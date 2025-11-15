// फ़ाइल का नाम: models/appointment.model.js
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        senior: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        scheduledTime: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: [
                "pending",
                "senior_proposed",
                "confirmed",
                "completed",
                "cancelled",
            ],
            default: "pending",
        },
        rejectionReason: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// 'export const Appointment' की जगह 'module.exports' का इस्तेमाल करें
const Appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = { Appointment };