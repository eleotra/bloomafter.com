import { json, getSessionUser } from '../_lib.js';

// GET /api/me
export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getSessionUser(request, env);
  if (!user) return json({ user: null });
  return json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      telegram_username: user.telegram_username
    }
  });
}
