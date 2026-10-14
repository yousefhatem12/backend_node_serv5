module.exports = (sequelize, DataTypes) => {
  const EmailOtp = sequelize.define('EmailOtp', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    otp: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('verification', 'password_reset'),
      allowNull: false,
      defaultValue: 'verification'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'email_otps',
    underscored: true,
    timestamps: true
  });

  return EmailOtp;
};
