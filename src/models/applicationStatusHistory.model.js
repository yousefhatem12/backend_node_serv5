const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ApplicationStatusHistory extends Model {
    static associate(models) {
      ApplicationStatusHistory.belongsTo(models.Application, {
        foreignKey: 'application_id',
        as: 'application'
      });
      ApplicationStatusHistory.belongsTo(models.User, {
        foreignKey: 'changed_by_user_id',
        as: 'changedByUser'
      });
    }
  }

  ApplicationStatusHistory.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      application_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
      },
      changed_by_user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
      },
      from_status: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      to_status: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'ApplicationStatusHistory',
      tableName: 'application_status_histories',
      underscored: true
    }
  );

  return ApplicationStatusHistory;
};
