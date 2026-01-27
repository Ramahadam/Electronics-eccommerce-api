class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObject = { ...this.queryString };
    const excludedElements = ['page', 'limit', 'sort', 'feilds'];

    excludedElements.forEach((el) => delete queryObject[el]);

    let queryStr = JSON.stringify(queryObject);

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
      const fields = this.queryString.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  pagination() {
    const page = (this.queryString * 1) | 1;
    const limit = Math.min(this.queryString.limit * 1 || 20, 100);
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

let queryStr = {
  category: 'laptop',
  price: { gte: '1000' },
  sort: '-unitPrice,avgRatings',
  page: '1',
  limit: '10',
};

let query = Product.find();

const apiFeat = new APIFeatures(query, queryStr);
