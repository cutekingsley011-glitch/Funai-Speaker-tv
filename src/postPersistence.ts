export type Post = {
  id: string;
  title: string;
  excerpt: string;
  body?: string;
  category: string;
  author: string;
  time: string;
  createdAt?: number;
  likes: number;
  comments: number;
  views?: number;
  image?: string;
  imagePath?: string;
  featured?: boolean;
  breaking?: boolean;
  published?: boolean;
  status?: string;
  scheduledAt?: string | number;
  gistStyle?: string;
};

const DELETED_POSTS_KEY = 'fstv-deleted-post-ids';
const CUSTOM_POSTS_KEY = 'fstv-custom-posts';

export function getDeletedPostIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_POSTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function recordDeletedPost(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const ids = getDeletedPostIds();
    ids.add(id);
    localStorage.setItem(DELETED_POSTS_KEY, JSON.stringify(Array.from(ids)));
    const custom = getCustomPosts().filter((p) => p.id !== id);
    localStorage.setItem(CUSTOM_POSTS_KEY, JSON.stringify(custom));
  } catch {}
}

export function getCustomPosts(): Post[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPost(post: Partial<Post> & { id: string; title: string; category: string; author: string }) {
  if (typeof window === 'undefined') return;
  try {
    const deletedIds = getDeletedPostIds();
    deletedIds.delete(post.id);
    localStorage.setItem(DELETED_POSTS_KEY, JSON.stringify(Array.from(deletedIds)));

    const normalizedPost: Post = {
      ...post,
      excerpt: post.excerpt || '',
      time: post.time || 'Just now',
      likes: Number(post.likes) || 0,
      comments: Number(post.comments) || 0,
      views: Number(post.views) || 0,
      published: post.published !== false,
      status: post.status || 'published',
    };

    const existing = getCustomPosts().filter((p) => p.id !== post.id);
    localStorage.setItem(CUSTOM_POSTS_KEY, JSON.stringify([normalizedPost, ...existing]));
  } catch {}
}

export function mergeAndFilterPosts(apiPosts: any[]): Post[] {
  const deletedIds = getDeletedPostIds();
  const customPosts = getCustomPosts();

  const map = new Map<string, Post>();
  for (const p of customPosts) {
    if (p.id && !deletedIds.has(p.id)) {
      map.set(p.id, {
        ...p,
        time: p.time || 'Just now',
        likes: Number(p.likes) || 0,
        comments: Number(p.comments) || 0,
      });
    }
  }
  for (const p of apiPosts) {
    if (p.id && !deletedIds.has(p.id) && !map.has(p.id)) {
      map.set(p.id, {
        ...p,
        time: p.time || 'Just now',
        likes: Number(p.likes) || 0,
        comments: Number(p.comments) || 0,
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)
  );
}
