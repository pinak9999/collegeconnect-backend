router.post('/', auth, async (req, res) => {
  try {
    // 1. Check karo data aa raha hai ya nahi
    console.log("📥 Received Booking Request:", req.body);

    const { mentorId, topic, date, time } = req.body;

    // 2. Strict Validation
    if (!mentorId || !topic || !date || !time) {
      console.log("❌ Missing Fields");
      return res.status(400).json({ msg: 'Please provide Topic, Date, and Time.' });
    }

    // 3. Time Logic (30 Mins Add karna)
    const [hours, minutes] = time.split(':').map(Number);
    let endHours = hours;
    let endMinutes = minutes + 30;
    
    if (endMinutes >= 60) {
        endHours += 1;
        endMinutes -= 60;
    }

    const startTimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const endTimeFormatted = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

    // 4. Save to DB
    const newBooking = new Booking({
      student: req.user.id,
      senior: mentorId, // Ensure schema uses 'senior' or 'mentor'
      topic: topic,
      scheduledDate: new Date(date),
      startTime: startTimeFormatted,
      endTime: endTimeFormatted,
      status: 'pending' // Default status
    });

    const savedBooking = await newBooking.save();
    console.log("✅ Booking Saved:", savedBooking._id);
    
    res.json(savedBooking);

  } catch (err) {
    console.error("❌ Server Error in Booking:", err.message);
    res.status(500).send('Server Error');
  }
});