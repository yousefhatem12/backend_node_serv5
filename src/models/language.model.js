module.exports = (sequelize, DataTypes) => {
  const Language = sequelize.define('Language', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    candidate_profile_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    language: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    proficiency: {
      type: DataTypes.ENUM('basic', 'conversational', 'fluent', 'native'),
      allowNull: false,
      defaultValue: 'conversational'
    },
    source: {
      type: DataTypes.ENUM('manual', 'cv'),
      allowNull: false,
      defaultValue: 'manual'
    }
  }, {
    tableName: 'languages',
    underscored: true,
    timestamps: true
  });

  Language.associate = (models) => {
    Language.belongsTo(models.CandidateProfile, { foreignKey: 'candidate_profile_id', as: 'candidateProfile' });
  };

  return Language;
};
