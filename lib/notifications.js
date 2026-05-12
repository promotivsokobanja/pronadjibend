import prisma from './prisma';

/**
 * Create an in-app notification for a user.
 * @param {{ userId: string, type: string, title: string, body?: string, link?: string }} params
 */
export async function createNotification({ userId, type, title, body, link }) {
  if (!userId || !type || !title) return null;
  try {
    return await prisma.notification.create({
      data: { userId, type, title, body: body || null, link: link || null },
    });
  } catch (e) {
    console.error('[Notification] Failed to create:', e.message);
    return null;
  }
}

/**
 * Create notifications for multiple users at once.
 * @param {Array<{ userId: string, type: string, title: string, body?: string, link?: string }>} items
 */
export async function createNotifications(items) {
  if (!Array.isArray(items) || items.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: items.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body || null,
        link: n.link || null,
      })),
    });
  } catch (e) {
    console.error('[Notification] Bulk create failed:', e.message);
  }
}
