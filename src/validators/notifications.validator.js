const { z } = require('zod');

const listNotificationsQuerySchema = z.object({
  query: z.object({
    unread_only: z.preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional()),
    page: z.coerce.number().int().positive().default(1).optional(),
    per_page: z.coerce.number().int().positive().max(100).default(15).optional()
  })
});

const notificationParamSchema = z.object({
  params: z.object({
    notification: z.coerce.number().int().positive({ message: 'The notification parameter must be a positive integer.' })
  })
});

const adminComposeNotificationSchema = z.object({
  target_type: z.enum(['all', 'candidates', 'user_ids']).default('all').optional(),
  user_ids: z.array(z.coerce.number().int().positive()).optional(),
  title: z.string({ required_error: 'The title is required.' }).trim().min(1).max(255),
  body: z.string({ required_error: 'The body is required.' }).trim().min(1).max(5000),
  type: z.string().trim().max(100).default('system_announcement').optional(),
  data: z.record(z.any()).optional().nullable()
}).refine((data) => {
  if (data.target_type === 'user_ids') {
    return Array.isArray(data.user_ids) && data.user_ids.length > 0;
  }
  return true;
}, {
  message: 'The user_ids array is required when target_type is user_ids.',
  path: ['user_ids']
});

module.exports = {
  listNotificationsQuerySchema,
  notificationParamSchema,
  adminComposeNotificationSchema
};
