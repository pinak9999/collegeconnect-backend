// फ़ाइल का नाम: routes/appointment.routes.js

const express = require("express");
const router = express.Router();

// 'import' की जगह 'require'
const {
    createAppointment,
    getMyAppointments,
    acceptAppointment,
    proposeNewTime,
    confirmNewTime,
    cancelAppointment,
    completeAppointment,
} = require("../controllers/appointment.controller.js"); // यह हमारा अगला कदम होगा

// (मान लेते हैं कि आपकी auth middleware 'middlewares/auth.js' में है)

// 🔽🔽 [यहाँ ठीक किया गया - 1] 🔽🔽
// { } हटा दिए गए हैं, क्योंकि यह एक डिफ़ॉल्ट एक्सपोर्ट है
const authmiddleware = require("../middleware/auth.js");

// 🔽🔽 [यहाँ ठीक किया गया - 2] 🔽🔽
// अब यह 'authMiddleware' वैरिएबल का सही से इस्तेमाल कर रहा है
router.use(authmiddleware);


// --- स्टूडेंट के लिए रूट्स ---

// POST /api/v1/appointments
// एक नई अपॉइंटमेंट रिक्वेस्ट भेजना
router.route("/").post(createAppointment);

// GET /api/v1/appointments/my
// मेरी (स्टूडेंट या सीनियर) सभी अपॉइंटMENTS देखना
router.route("/my").get(getMyAppointments);

// PATCH /api/v1/appointments/:id/confirm
// सीनियर के दिए नए टाइम को कन्फर्म करना (स्टूडेंट)
router.route("/:id/confirm").patch(confirmNewTime);


// --- सीनियर के लिए रूट्स ---

// PATCH /api/v1/appointments/:id/accept
// स्टूडेंट की रिक्वेस्ट को मानना (सीनियर)
router.route("/:id/accept").patch(acceptAppointment);

// PATCH /api/v1/appointments/:id/propose
// रिक्वेस्ट रिजेक्ट करके नया टाइम देना (सीनियर)
router.route("/:id/propose").patch(proposeNewTime);


// --- दोनों के लिए रूट्स ---

// PATCH /api/v1/appointments/:id/cancel
// अपॉइंटमेंट को कैंसिल करना (स्टूडेंट या सीनियर)
router.route("/:id/cancel").patch(cancelAppointment);

// PATCH /api/v1/appointments/:id/complete
// कॉल पूरी होने पर मार्क करना
router.route("/:id/complete").patch(completeAppointment);

// 'export default' की जगह 'module.exports'
module.exports = router;