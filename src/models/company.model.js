'use strict';

module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    normalized_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    industry: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    website_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    linkedin_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    logo_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'companies',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: (company) => {
        if (company.name) {
          company.normalized_name = company.name.trim().toLowerCase();
        }
      }
    }
  });

  Company.associate = (models) => {
    Company.hasMany(models.CompanyAlias, {
      as: 'aliases',
      foreignKey: 'company_id'
    });
    Company.hasMany(models.JobPost, {
      as: 'jobPosts',
      foreignKey: 'company_id'
    });
  };

  return Company;
};
