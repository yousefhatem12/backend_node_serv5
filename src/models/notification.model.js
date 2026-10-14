const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }

    isRead() {
      return Boolean(this.read_at);
    }
  }

  Notification.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'system'
      },
      data: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
          const raw = this.getDataValue('data');
          if (!raw) return null;
          if (typeof raw === 'string') {
            try {
              return JSON.parse(raw);
            } catch (e) {
              return null;
            }
          }
          return raw;
        }
      },
      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      }
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'notifications',
      underscored: true
    }
  );

  return Notification;
};
