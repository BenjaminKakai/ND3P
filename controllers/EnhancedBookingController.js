// controllers/EnhancedBookingController.js
class EnhancedBookingController {
    constructor(repository) {
        this.repository = repository;
    }

    async createBranch(req, res) {
        try {
            const branch = await this.repository.createBranch(req.body);
            res.status(201).json(branch);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async generateTimeSlots(req, res) {
        try {
            const { branchId, date, serviceDuration } = req.body;
            const slots = await this.repository.generateTimeSlots(
                branchId,
                date,
                serviceDuration
            );
            res.status(200).json(slots);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async createEnhancedBooking(req, res) {
        try {
            const booking = await this.repository.createEnhancedBooking(req.body);
            res.status(201).json(booking);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

// Add this line to properly export the class
module.exports = EnhancedBookingController;