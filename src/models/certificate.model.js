module.exports = (sequelize, DataTypes) => {
  const Certificate = sequelize.define('Certificate', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    candidate_profile_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    issuing_organization: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    expiration_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    credential_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    credential_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    source: {
      type: DataTypes.ENUM('manual', 'cv'),
      allowNull: false,
      defaultValue: 'manual'
    }
  }, {
    tableName: 'certificates',
    underscored: true,
    timestamps: true
  });

  Certificate.associate = (models) => {
    Certificate.belongsTo(models.CandidateProfile, { foreignKey: 'candidate_profile_id', as: 'candidateProfile' });
  };

  return Certificate;
};
