const config = require('../config/env');

class PaginatedResource {
  static format({ rows, count }, resourceClass, page = 1, perPage = 15, reqUrl = '') {
    const total = count;
    const currentPage = parseInt(page, 10) || 1;
    const limit = parseInt(perPage, 10) || 15;
    const lastPage = Math.max(1, Math.ceil(total / limit));
    const from = total === 0 ? 0 : (currentPage - 1) * limit + 1;
    const to = total === 0 ? 0 : Math.min(currentPage * limit, total);

    const baseUrl = reqUrl.startsWith('http')
      ? reqUrl.split('?')[0]
      : `${config.appUrl}${reqUrl.split('?')[0]}`;

    const data = resourceClass
      ? resourceClass.collection(rows)
      : rows;

    const links = {
      first: `${baseUrl}?page=1`,
      last: `${baseUrl}?page=${lastPage}`,
      prev: currentPage > 1 ? `${baseUrl}?page=${currentPage - 1}` : null,
      next: currentPage < lastPage ? `${baseUrl}?page=${currentPage + 1}` : null
    };

    const meta = {
      current_page: currentPage,
      from,
      last_page: lastPage,
      per_page: limit,
      to,
      total
    };

    return {
      data,
      links,
      meta
    };
  }
}

module.exports = PaginatedResource;
