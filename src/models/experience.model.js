module.exports = (sequelize, DataTypes) => {
  const Experience = sequelize.define('Experience', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    candidate_profile_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    job_title: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    company_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    employment_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'full-time'
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    technologies: {
      type: DataTypes.JSON,
      allowNull: true,
      get() {
        const raw = this.getDataValue('technologies');
        if (!raw) return [];
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      },
      set(val) {
        this.setDataValue('technologies', typeof val === 'object' ? val : (val ? [val] : []));
      }
    },
    source: {
      type: DataTypes.ENUM('manual', 'cv'),
      allowNull: false,
      defaultValue: 'manual'
    }
  }, {
    tableName: 'experiences',
    underscored: true,
    timestamps: true
  });

  Experience.associate = (models) => {
    Experience.belongsTo(models.CandidateProfile, { foreignKey: 'candidate_profile_id', as: 'candidateProfile' });
  };

  return Experience;
};
