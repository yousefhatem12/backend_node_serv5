module.exports = (sequelize, DataTypes) => {
  const QueueJob = sequelize.define('QueueJob', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    queue: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'default'
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    payload: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      get() {
        const raw = this.getDataValue('payload');
        try {
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          return raw;
        }
      },
      set(val) {
        this.setDataValue('payload', typeof val === 'object' ? JSON.stringify(val) : val);
      }
    },
    attempts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    max_attempts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 3
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    available_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    reserved_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'jobs',
    underscored: true,
    timestamps: true
  });

  return QueueJob;
};
