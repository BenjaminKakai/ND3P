const { 
    Booking, 
    Offer, 
    Service, 
    Store, 
    User, 
    Payment,
    Chat,
    Message,
    Review,
    sequelize
  } = require('../models');
  const { Op } = require('sequelize');
  const moment = require('moment');
  
  class BookingRepository {
    async create(bookingData) {
      try {
        const booking = await Booking.create(bookingData);
        return booking;
      } catch (error) {
        throw new Error(`Error creating booking: ${error.message}`);
      }
    }
  
    async findAll() {
      try {
        return await Booking.findAll();
      } catch (error) {
        throw new Error(`Error fetching all bookings: ${error.message}`);
      }
    }
  
    async findById(id, includeRelations = true) {
      try {
        const options = {
          where: { id }
        };
  
        if (includeRelations) {
          options.include = [
            {
              model: Offer,
              attributes: ['discount', 'expiration_date', 'description', 'status'],
              include: [
                {
                  model: Service,
                  attributes: ['name', 'price', 'duration', 'category', 'description'],
                  include: [
                    {
                      model: Store,
                      attributes: ['name', 'location'],
                    },
                  ],
                },
              ],
            },
            {
              model: User,
              attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
            },
          ];
        }
  
        const booking = await Booking.findOne(options);
        
        if (!booking) {
          throw new Error('Booking not found');
        }
  
        return booking;
      } catch (error) {
        throw new Error(`Error fetching booking: ${error.message}`);
      }
    }
  
    async update(id, updateData) {
      try {
        const booking = await this.findById(id, false);
        await booking.update(updateData);
        return booking;
      } catch (error) {
        throw new Error(`Error updating booking: ${error.message}`);
      }
    }
  
    async delete(id) {
      try {
        const booking = await this.findById(id, false);
        await booking.destroy();
        return true;
      } catch (error) {
        throw new Error(`Error deleting booking: ${error.message}`);
      }
    }
  
    async findByOffer(offerId) {
      try {
        const bookings = await Booking.findAll({
          where: { offerId },
          include: [
            {
              model: Offer,
              attributes: ['name', 'description'],
              include: [
                {
                  model: Service,
                  attributes: ['name'],
                  include: [
                    {
                      model: Store,
                      attributes: ['name', 'location'],
                    },
                  ],
                },
              ],
            },
          ],
        });
  
        return bookings;
      } catch (error) {
        throw new Error(`Error fetching bookings by offer: ${error.message}`);
      }
    }
  
    async findByStore(storeId) {
      try {
        const bookings = await Booking.findAll({
          include: [
            {
              model: Offer,
              attributes: ['discount', 'expiration_date', 'description', 'status'],
              include: [
                {
                  model: Service,
                  attributes: ['name', 'price', 'duration', 'category', 'description'],
                  include: [
                    {
                      model: Store,
                      where: { id: storeId },
                      attributes: ['name', 'location'],
                    },
                  ],
                },
              ],
            },
            {
              model: User,
              attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
            },
          ],
        });
  
        return bookings;
      } catch (error) {
        throw new Error(`Error fetching bookings by store: ${error.message}`);
      }
    }
  
    async findByUser(userId) {
      try {
        const bookings = await Booking.findAll({
          where: { userId },
          include: [
            {
              model: Offer,
              attributes: ['discount', 'expiration_date', 'description', 'status'],
              include: [
                {
                  model: Service,
                  attributes: ['name', 'price', 'duration', 'category', 'description'],
                  include: [
                    {
                      model: Store,
                      attributes: ['name', 'location'],
                    },
                  ],
                },
              ],
            },
          ],
        });
  
        return bookings;
      } catch (error) {
        throw new Error(`Error fetching bookings by user: ${error.message}`);
      }
    }
  
    async findByPaymentCode(paymentUniqueCode, status = 'pending') {
      try {
        return await Booking.findOne({
          where: { paymentUniqueCode, status }
        });
      } catch (error) {
        throw new Error(`Error fetching booking by payment code: ${error.message}`);
      }
    }
  
    async checkTimeSlotAvailability(offerId, startTime, endTime) {
      try {
        const existingBooking = await Booking.findOne({
          where: {
            offerId,
            status: { [Op.not]: 'cancelled' },
            [Op.or]: [
              { startTime: { [Op.between]: [startTime, endTime] } },
              { endTime: { [Op.between]: [startTime, endTime] } },
              {
                [Op.and]: [
                  { startTime: { [Op.lte]: startTime } },
                  { endTime: { [Op.gte]: endTime } }
                ]
              }
            ]
          }
        });
  
        return !existingBooking;
      } catch (error) {
        throw new Error(`Error checking time slot availability: ${error.message}`);
      }
    }
  
    async getAvailableSlots(date, offerId) {
      try {
        const bookings = await Booking.findAll({
          where: {
            startTime: {
              [Op.gte]: moment(date).startOf('day').toDate(),
              [Op.lte]: moment(date).endOf('day').toDate(),
            },
            offerId: offerId,
          },
        });
  
        return bookings;
      } catch (error) {
        throw new Error(`Error fetching available slots: ${error.message}`);
      }
    }
  
    async getStoreAnalytics(storeId, startDate, endDate) {
      try {
        const query = {
          include: [
            {
              model: Offer,
              include: [
                {
                  model: Service,
                  include: [
                    {
                      model: Store,
                      where: { id: storeId },
                    },
                  ],
                },
              ],
            },
          ],
        };
  
        if (startDate && endDate) {
          query.where = {
            startTime: {
              [Op.between]: [new Date(startDate), new Date(endDate)],
            },
          };
        }
  
        const bookings = await Booking.findAll(query);
  
        return {
          totalBookings: bookings.length,
          completedBookings: bookings.filter(b => b.status === 'fulfilled').length,
          cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
          pendingBookings: bookings.filter(b => b.status === 'pending').length,
          totalRevenue: bookings.reduce((sum, booking) => sum + (booking.Offer?.Service?.price || 0), 0),
          averageBookingsPerDay: bookings.length / (moment(endDate).diff(moment(startDate), 'days') || 1),
        };
      } catch (error) {
        throw new Error(`Error fetching store analytics: ${error.message}`);
      }
    }
  
    async getBookingTimes(serviceId) {
      try {
        const service = await Service.findByPk(serviceId, {
          include: [
            {
              model: Offer,
              as: 'Offers',
              include: {
                model: Booking,
                as: 'Bookings',
              },
            },
          ],
        });
  
        if (!service) {
          throw new Error('Service not found');
        }
  
        const bookings = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
  
        service.Offers.forEach(offer => {
          if (offer.Bookings && offer.Bookings.length > 0) {
            offer.Bookings.forEach(booking => {
              if (new Date(booking.startTime) >= today) {
                bookings.push({
                  startTime: booking.startTime,
                  endTime: booking.endTime,
                });
              }
            });
          }
        });
  
        return bookings;
      } catch (error) {
        throw new Error(`Error fetching booking times: ${error.message}`);
      }
    }
  }
  
  module.exports = new BookingRepository();