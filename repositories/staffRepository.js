const { Staff, Service, StaffService, Store, Booking, Offer, User } = require('../models');
const bcrypt = require('bcryptjs');

class StaffRepository {
    async createStaff(staffData) {
        const { storeId, email } = staffData;

        const store = await Store.findByPk(storeId);
        if (!store) {
            throw new Error('Store not found');
        }

        const existingStaff = await Staff.findOne({
            where: { storeId, email }
        });

        if (existingStaff) {
            throw new Error('Staff with this email already exists in this store');
        }

        const hashedPassword = await bcrypt.hash(staffData.password, 10);

        return await Staff.create({
            ...staffData,
            password: hashedPassword
        });
    }

    async getAllStaff() {
        return await Staff.findAll({
            include: [{
                model: Store,
                as: 'store',
                attributes: ['name', 'location']
            }]
        });
    }

    async getStaffById(staffId) {
        const staff = await Staff.findByPk(staffId, {
            include: [{
                model: Service,
                as: 'services',
                through: { attributes: [] }
            }]
        });

        if (!staff) {
            throw new Error('Staff not found');
        }

        return staff;
    }

    async getStaffByStore(storeId) {
        const store = await Store.findByPk(storeId);
        if (!store) {
            throw new Error('Store not found');
        }

        const staff = await Staff.findAll({
            where: { storeId },
            include: [{
                model: Service,
                as: 'services',
                through: { attributes: [] }
            }]
        });

        if (!staff.length) {
            throw new Error('No staff found for this store');
        }

        return staff;
    }

    async updateStaff(staffId, updateData) {
        const staff = await Staff.findByPk(staffId);
        if (!staff) {
            throw new Error('Staff not found');
        }

        if (updateData.email && updateData.email !== staff.email) {
            const emailExists = await Staff.findOne({
                where: { 
                    email: updateData.email, 
                    storeId: staff.storeId 
                }
            });
            
            if (emailExists) {
                throw new Error('A staff member with this email already exists in this store');
            }
        }

        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        await staff.update(updateData);
        return staff;
    }

    async deleteStaff(staffId) {
        const staff = await Staff.findByPk(staffId);
        if (!staff) {
            throw new Error('Staff not found');
        }

        await staff.destroy();
        return true;
    }

    async assignService(staffId, serviceId) {
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

        const existingAssignment = await StaffService.findOne({
            where: { staffId, serviceId }
        });

        if (existingAssignment) {
            throw new Error('Service already assigned to staff');
        }

        return await StaffService.create({ staffId, serviceId });
    }

    async unassignService(staffId, serviceId) {
        const assignment = await StaffService.findOne({
            where: { staffId, serviceId }
        });

        if (!assignment) {
            throw new Error('Service not assigned to this staff');
        }

        await assignment.destroy();
        return true;
    }

    async getStaffBookings(staffId) {
        const staff = await Staff.findByPk(staffId, {
            include: [{
                model: Service,
                as: 'services'
            }]
        });

        if (!staff) {
            throw new Error('Staff not found');
        }

        if (!staff.services.length) {
            throw new Error('No services assigned to this staff');
        }

        const bookings = await Booking.findAll({
            include: [
                {
                    model: Offer,
                    where: {
                        service_id: staff.services.map(service => service.id)
                    },
                    include: [{
                        model: Service,
                        required: true
                    }]
                },
                {
                    model: User,
                    attributes: ['firstname', 'lastName', 'email', 'phoneNumber']
                }
            ]
        });

        return bookings;
    }

    async getStaffServices(staffId) {
        const staff = await Staff.findByPk(staffId);
        if (!staff) {
            throw new Error('Staff not found');
        }

        return await staff.getServices();
    }

    async getServiceStaff(serviceId) {
        const service = await Service.findByPk(serviceId, {
            include: {
                model: Staff,
                through: { attributes: [] }
            }
        });

        if (!service) {
            throw new Error('Service not found');
        }

        return {
            service,
            staff: service.Staff
        };
    }

    async validateStaffCredentials(email, password) {
        const staff = await Staff.findOne({ where: { email } });
        if (!staff) {
            throw new Error('Staff not found');
        }

        const isValidPassword = await bcrypt.compare(password, staff.password);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        return staff;
    }
}

module.exports = new StaffRepository();