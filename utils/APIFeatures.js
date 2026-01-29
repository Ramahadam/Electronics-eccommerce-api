class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.totalDocuments = 0;
  }

  filter() {
    const queryObject = { ...this.queryString };
    const excludedElements = ['page', 'limit', 'sort', 'fields'];

    excludedElements.forEach((el) => delete queryObject[el]);

    let queryStr = JSON.stringify(queryObject);

    // Convert query operators (gte, gt, lte, lt) to MongoDB operators ($gte, $gt, $lte, $lt)
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  pagination() {
    // Parse page and limit from query string with defaults
    const page = Math.max(1, this.queryString.page * 1 || 1);

    // Default: 10, Maximum: 20
    const limit = Math.min(
      Math.max(1, this.queryString.limit * 1 || 10),
      20, // Maximum 20
    );

    const skip = (page - 1) * limit;

    // Store pagination params for metadata generation
    this.paginationParams = { page, limit, skip };

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }

  /**
   * Get pagination metadata
   * This method should be called AFTER executing the query
   *
   * @param {number} totalDocuments - Total count of documents matching the filter
   * @returns {object} Pagination metadata
   */
  getPaginationMetadata(totalDocuments) {
    const { page, limit } = this.paginationParams || { page: 1, limit: 10 };

    return {
      currentPage: page,
      limit: limit,
      totalDocuments: totalDocuments,
      totalPages: Math.ceil(totalDocuments / limit),
      hasNextPage: page * limit < totalDocuments,
      hasPrevPage: page > 1,
    };
  }
}

module.exports = APIFeatures;
