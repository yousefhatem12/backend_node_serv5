'use strict';

module.exports = (sequelize, DataTypes) => {
  const CompanyAlias = sequelize.define('CompanyAlias', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    alias: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    normalized_alias: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'company_aliases',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: (ca) => {
        if (ca.alias) {
          ca.normalized_alias = ca.alias.trim().toLowerCase();
        }
      }
    }
  });

  CompanyAlias.associate = (models) => {
    CompanyAlias.belongsTo(models.Company, {
      as: 'company',
      foreignKey: 'company_id'
    });
  };

  return CompanyAlias;
};
