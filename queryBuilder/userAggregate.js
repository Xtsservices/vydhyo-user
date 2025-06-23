const userAggregation = (userId, excludeRefreshToken = false) => {
  const projectFields = {
    refreshToken : 1
  };

  if (excludeRefreshToken) {
    projectFields.refreshToken = 0;
  }


  return [
    { $match: { userId: userId } },
    {
      $lookup: {
        from: 'kycdetails',
        localField: 'userId',
        foreignField: 'userId',
        as: 'kycDetails'
      }
    },
    {
      $unwind: {
        path: '$kycDetails',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'addresses',
        localField: 'userId',
        foreignField: 'userId',
        as: 'addresses'
      }
    },
    {
      $lookup: {
        from: 'insurances',
        localField: 'userId',
        foreignField: 'userId',
        as: 'insuranceDetails'
      }
    },
    {
      $unwind: {
        path: '$insuranceDetails',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: projectFields
    }
  ];
};

module.exports = {
  userAggregation
};