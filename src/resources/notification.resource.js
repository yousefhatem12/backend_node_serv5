class NotificationResource {
  /**
   * Transform Notification model to JSON matching API_README contract
   */
  static toArray(notification) {
    if (!notification) return null;

    return {
      id: Number(notification.id),
      title: notification.title,
      body: notification.body,
      type: notification.type,
      data: notification.data || null,
      read_at: notification.read_at ? new Date(notification.read_at).toISOString() : null,
      created_at: notification.created_at ? new Date(notification.created_at).toISOString() : null
    };
  }

  /**
   * Transform collection of notifications
   */
  static collection(notifications) {
    if (!Array.isArray(notifications)) return [];
    return notifications.map(item => this.toArray(item));
  }
}

module.exports = NotificationResource;
