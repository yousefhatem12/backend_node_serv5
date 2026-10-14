module.exports = (sequelize, DataTypes) => {
  const Education = sequelize.define('Education', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    candidate_profile_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    institution: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    degree: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    field_of_study: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    education_level: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'bachelor'
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    grade: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    source: {
      type: DataTypes.ENUM('manual', 'cv'),
      allowNull: false,
      defaultValue: 'manual'
    }
  }, {
    tableName: 'educations',
    underscored: true,
    timestamps: true
  });

  Education.associate = (models) => {
    Education.belongsTo(models.CandidateProfile, { foreignKey: 'candidate_profile_id', as: 'candidateProfile' });
  };

  return Education;
};
