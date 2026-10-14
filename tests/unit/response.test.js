const { success, actionSuccess, paginated, validationError, error } = require('../../src/utils/response');
const { t } = require('../../src/utils/i18n');

describe('Response Helpers & i18n Unit Tests', () => {
  let res;

  beforeEach(() => {
    res = {
      statusCode: null,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
  });

  test('success() returns standard { data } object with status 200', () => {
    success(res, { id: 1, name: 'SkillMatch' });
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({
      data: { id: 1, name: 'SkillMatch' }
    });
  });

  test('actionSuccess() returns action envelope format', () => {
    actionSuccess(res, 'Action completed successfully.', { id: 5 });
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({
      status: 'success',
      message: 'Action completed successfully.',
      data: { id: 5 }
    });
  });

  test('paginated() returns data, links, meta matching Laravel contracts', () => {
    const meta = {
      current_page: 1,
      from: 1,
      last_page: 2,
      per_page: 15,
      to: 15,
      total: 30
    };
    const links = {
      first: 'http://localhost:8000/api/items?page=1',
      last: 'http://localhost:8000/api/items?page=2',
      prev: null,
      next: 'http://localhost:8000/api/items?page=2'
    };

    paginated(res, [{ id: 1 }], meta, links);
    expect(res.statusCode).toBe(200);
    expect(res.jsonData.data).toEqual([{ id: 1 }]);
    expect(res.jsonData.meta.total).toBe(30);
    expect(res.jsonData.links.next).toBe('http://localhost:8000/api/items?page=2');
  });

  test('validationError() returns 422 with message and errors map', () => {
    validationError(res, 'The email field is required.', { email: ['The email field is required.'] });
    expect(res.statusCode).toBe(422);
    expect(res.jsonData).toEqual({
      message: 'The email field is required.',
      errors: {
        email: ['The email field is required.']
      }
    });
  });

  test('error() returns generic error message', () => {
    error(res, 'Not found.', 404);
    expect(res.statusCode).toBe(404);
    expect(res.jsonData).toEqual({
      message: 'Not found.'
    });
  });

  test('i18n translates English and Arabic messages correctly', () => {
    expect(t('common.success', 'en')).toBe('Action completed successfully.');
    expect(t('common.success', 'ar')).toBe('تمت العملية بنجاح.');
    // Fallback on missing key
    expect(t('non_existing_key.abc', 'ar')).toBe('non_existing_key.abc');
  });
});
