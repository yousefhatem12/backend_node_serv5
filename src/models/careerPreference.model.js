module.exports = (sequelize, DataTypes) => {
  const CareerPreference = sequelize.define('CareerPreference', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    candidate_profile_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true
    },
    target_role: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    target_roles: {
      type: DataTypes.JSON,
      allowNull: true,
      get() {
        const raw = this.getDataValue('target_roles');
        if (!raw) return [];
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      },
      set(val) {
        this.setDataValue('target_roles', typeof val === 'object' ? val : (val ? [val] : []));
      }
    },
    job_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'full-time'
    },
    work_mode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'remote'
    },
    preferred_country: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    preferred_city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    experience_level: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'mid-level'
    },
    career_goal: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    open_to_relocation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    preferred_industries: {
      type: DataTypes.JSON,
      allowNull: true,
      get() {
        const raw = this.getDataValue('preferred_industries');
        if (!raw) return [];
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      },
      set(val) {
        this.setDataValue('preferred_industries', typeof val === 'object' ? val : (val ? [val] : []));
      }
    }
  }, {
    tableName: 'career_preferences',
    underscored: true,
    timestamps: true
  });

  CareerPreference.associate = (models) => {
    CareerPreference.belongsTo(models.CandidateProfile, { foreignKey: 'candidate_profile_id', as: 'candidateProfile' });
  };

  return CareerPreference;
};
