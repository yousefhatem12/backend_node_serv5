module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('Project', {
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
    project_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    github_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    source: {
      type: DataTypes.ENUM('manual', 'cv'),
      allowNull: false,
      defaultValue: 'manual'
    }
  }, {
    tableName: 'projects',
    underscored: true,
    timestamps: true
  });

  Project.associate = (models) => {
    Project.belongsTo(models.CandidateProfile, { foreignKey: 'candidate_profile_id', as: 'candidateProfile' });
  };

  return Project;
};
