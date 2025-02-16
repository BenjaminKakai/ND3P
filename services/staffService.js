const { Staff, StaffService, Service, Store, Booking, Offer, User } = require('../models');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const ejs = require('ejs');
const { sendEmail } = require('../utils/emailUtil');

class StaffServiceClass {
    // Create a new staff member
    static async createStaff(storeId, email, name) {
        const store = await Store.findByPk(storeId);
        if (!store) {
            throw new Error('Store not found');
        }

        const existingStaff = await Staff.findOne({ where: { storeId, email } });
        if (existingStaff) {
            throw new Error('Staff with this email already exists in this store');
        }

        const temporaryPassword = Math.random().toString(36).substring(2, 10);
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        const staff = await Staff.create({
            storeId,
            email,
            name,
            password: hashedPassword,
            status: 'active',
        });

        const templatePath = './templates/inviteStaff.ejs';
        const template = fs.readFileSync(templatePath, 'utf8');
        const emailContent = ejs.render(template, {
            storeName: store.name,
            temporaryPassword,
            loginLink: 'https://example.com/login',
        });

        await sendEmail(
            staff.email,
            `You’ve been invited to join ${store.name}`,
            '',
            emailContent
        );

        return {
            message: 'Staff created successfully, and invitation email sent',
            staff: {
                id: staff.id,
                email: staff.email,
                name: staff.name,
                storeId: staff.storeId,
                status: staff.status,
                createdAt: staff.createdAt,
            },
        };
    }

    // Get all staff members
    static async getAllStaff() {
        const staff = await Staff.findAll();
        return staff;
    }

    // Get a staff member by ID
    static async getStaffById(id) {
        const staff = await Staff.findByPk(id);
        if (!staff) {
            throw new Error('Staff not found');
        }

        const services = await staff.getServices();
        return { staff, services };
    }

    // Get staff members by store ID
    static async getStaffByStore(storeId) {
        const store = await Store.findByPk(storeId);
        if (!store) {
            throw new Error('Store not found');
        }

        const staff = await Staff.findAll({ where: { storeId } });
        if (!staff.length) {
            throw new Error('No staff found for this store');
        }

        return staff;
    }

    // Update a staff member
    static async updateStaff(id, updateData) {
        const staff = await Staff.findByPk(id);
        if (!staff) {
            throw new Error('Staff not found');
        }

        if (updateData.email && updateData.email !== staff.email) {
            const emailExists = await Staff.findOne({
                where: { email: updateData.email, storeId: staff.storeId },
            });
            if (emailExists) {
                throw new Error('A staff member with this email already exists in this store');
            }
            staff.email = updateData.email;
        }

        staff.name = updateData.name || staff.name;
        staff.phoneNumber = updateData.phoneNumber || staff.phoneNumber;
        staff.status = updateData.status || staff.status;
        await staff.save();

        return { message: 'Staff updated successfully', staff };
    }

    // Delete a staff member
    static async deleteStaff(id) {
        const staff = await Staff.findByPk(id);
        if (!staff) {
            throw new Error('Staff not found');
        }

        await staff.destroy();
        return { message: 'Staff deleted successfully' };
    }

    // Assign a service to a staff member
    static async assignService(staffId, serviceId) {
        const staff = await Staff.findByPk(staffId);
        if (!staff) {
            throw new Error('Staff not found');
        }

        const service = await Service.findByPk(serviceId);
        if (!service) {
            throw new Error('Service not found');
        }

        if (staff.storeId !== service.store_id) {
            throw new Error('Store ID mismatch');
        }

        const existingAssignment = await StaffService.findOne({ where: { staffId, serviceId } });
        if (existingAssignment) {
            throw new Error('Service already assigned to staff');
        }

        await StaffService.create({ staffId, serviceId });
        return { message: 'Service assigned to staff successfully' };
    }

    // Unassign a service from a staff member
    static async unassignService(staffId, serviceId) {
        const assignment = await StaffService.findOne({ where: { staffId, serviceId } });
        if (!assignment) {
            throw new Error('Service not assigned to this staff');
        }

        await assignment.destroy();
        return { message: 'Service unassigned from staff successfully' };
    }

    // Get bookings by staff ID
    static async getBookingsByStaffId(staffId) {
        const staff = await Staff.findByPk(staffId);
        if (!staff) {
            throw new Error('Staff not found');
        }

        const services = await staff.getServices();
        if (!services.length) {
            throw new Error('No services assigned to this staff');
        }

        const bookings = await Booking.findAll({
            include: [
                {
                    model: Offer,
                    where: { service_id: services.map(service => service.id) },
                    include: [{ model: Service, required: true }],
                },
                {
                    model: User,
                    attributes: ['firstname', 'lastName', 'email', 'phoneNumber'],
                },
            ],
        });

        if (!bookings.length) {
            throw new Error('No bookings found for this staff');
        }

        return bookings;
    }

    // Get services by staff ID
    static async getServicesByStaffId(staffId) {
        const staff = await Staff.findByPk(staffId);
        if (!staff) {
            throw new Error('Staff not found');
        }

        const services = await staff.getServices();
        return services;
    }

    // Get staff members by service ID
    static async getStaffByService(serviceId) {
        const service = await Service.findByPk(serviceId, {
            include: {
                model: Staff,
                through: { attributes: [] }, // Ignore the join table
            },
        });

        if (!service) {
            throw new Error('Service not found');
        }

        return {
            service,
            staff: service.Staff,
        };
    }
}

module.exports = StaffServiceClass;