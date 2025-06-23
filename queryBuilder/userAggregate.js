const userAggregation = (userId, excludeRefreshToken = false) => {
  const pipeline = [
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
    }
  ];

  // Only add $project if exclusion is needed
  if (excludeRefreshToken) {
    pipeline.push({
      $project: {
        refreshToken: 0
      }
    });
  }

  return pipeline;
};

module.exports = {
  userAggregation
};
