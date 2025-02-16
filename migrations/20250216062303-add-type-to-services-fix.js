'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('Services', 'type', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'fixed',
        validate: {
          isIn: [['fixed', 'dynamic']]
        }
      });
    } catch (error) {
      console.log('Migration error:', error);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('Services', 'type');
    } catch (error) {
      console.log('Rollback error:', error);
    }
  }
};
