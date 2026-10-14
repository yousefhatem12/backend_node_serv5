/**
 * Standard API Response Helpers matching API_README.md contracts
 */

function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    data
  });
}

function actionSuccess(res, message, data = null, statusCode = 200) {
  const payload = {
    status: 'success',
    message
  };
  if (data !== null) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
}

function paginated(res, data, meta, links = {}, statusCode = 200) {
  return res.status(statusCode).json({
    data,
    links,
    meta
  });
}

function validationError(res, message, errors, statusCode = 422) {
  return res.status(statusCode).json({
    message,
    errors
  });
}

function error(res, message, statusCode = 500) {
  return res.status(statusCode).json({
    message
  });
}

function buildPaginationMeta(total, page, perPage, baseUrl = '') {
  const currentPage = Number(page) || 1;
  const perPageNum = Number(perPage) || 15;
  const lastPage = Math.max(1, Math.ceil(total / perPageNum));
  const from = total === 0 ? null : (currentPage - 1) * perPageNum + 1;
  const to = total === 0 ? null : Math.min(total, currentPage * perPageNum);

  const meta = {
    current_page: currentPage,
    from,
    last_page: lastPage,
    per_page: perPageNum,
    to,
    total
  };

  const links = {
    first: baseUrl ? `${baseUrl}?page=1` : null,
    last: baseUrl ? `${baseUrl}?page=${lastPage}` : null,
    prev: currentPage > 1 && baseUrl ? `${baseUrl}?page=${currentPage - 1}` : null,
    next: currentPage < lastPage && baseUrl ? `${baseUrl}?page=${currentPage + 1}` : null
  };

  return { meta, links };
}

module.exports = {
  success,
  actionSuccess,
  paginated,
  buildPaginationMeta,
  validationError,
  error
};
